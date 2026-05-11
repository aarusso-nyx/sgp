import {
  BadRequestException,
  Injectable,
  Optional,
  PreconditionFailedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  DctfwebDeclarationDetailsDto,
  DctfwebDeclarationDto,
  DctfwebItemDto,
  GenerateDctfwebDto,
} from './dctfweb.dto';
import {
  DeclarationRow,
  ItemRow,
  PgdTaxDebitRow,
  TotalizerRow,
  XmlItemMetadata,
} from './dctfweb-builder.types';
import { competenceDate, dateText, sha256 } from './dctfweb-builder.util';
import { DctfwebMitSectionService } from './dctfweb-mit-section.service';
import { DctfwebTotalizerSectionService } from './dctfweb-totalizer-section.service';
import {
  buildDctfwebXml,
  parseDctfwebXmlItemMetadata,
} from './dctfweb-xml.builder';

export { buildDctfwebXml } from './dctfweb-xml.builder';

@Injectable()
export class DctfwebBuilderService {
  private readonly totalizerSection: DctfwebTotalizerSectionService;
  private readonly mitSection: DctfwebMitSectionService;

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() totalizerSection?: DctfwebTotalizerSectionService,
    @Optional() mitSection?: DctfwebMitSectionService,
  ) {
    this.totalizerSection =
      totalizerSection ?? new DctfwebTotalizerSectionService(databaseService);
    this.mitSection =
      mitSection ?? new DctfwebMitSectionService(databaseService);
  }

  async list(year?: number, month?: number): Promise<DctfwebDeclarationDto[]> {
    this.ensureDatabase();
    const params: unknown[] = [];
    const filters: string[] = [];
    if (year && month) {
      params.push(competenceDate(year, month));
      filters.push(`competence = $${params.length}::date`);
    }
    const rows = await this.databaseService.query<DeclarationRow>(
      `
      SELECT
        declaration_id::text AS id,
        competence,
        kind::text,
        status::text,
        original_declaration_id::text,
        payload_xml_ref,
        NULL::text AS payload_xml,
        payload_xml_hash,
        signed_xml_ref,
        NULL::text AS signed_xml,
        signed_xml_hash,
        transmitted_xml_hash,
        receipt_number,
        receipt_at,
        item_count,
        total_base_amount::text,
        total_amount::text,
        created_at,
        updated_at
      FROM fiscal.v_dctfweb_summary
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY competence DESC, created_at DESC
      `,
      params,
    );
    return rows.map((row) => this.toDto(row));
  }

  async find(id: string): Promise<DctfwebDeclarationDetailsDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DeclarationRow>(
      declarationSelectSql('WHERE declaration.id = $1::uuid'),
      [id],
    );
    const declaration = rows[0];
    if (!declaration) {
      throw new BadRequestException('DCTFWeb declaration not found');
    }
    const items = await this.databaseService.query<ItemRow>(
      `
      SELECT
        id::text,
        source_event::text,
        source_run_id::text,
        debit_code,
        base_amount::text,
        amount::text,
        csll_adicional_amount::text,
        NULL::text AS mit_status,
        NULL::text AS mit_debit_id,
        NULL::text AS cnpj_filial
      FROM fiscal.dctfweb_item
      WHERE declaracao_id = $1::uuid
      ORDER BY source_event, debit_code
      `,
      [id],
    );
    const xmlItemMetadata = parseDctfwebXmlItemMetadata(
      declaration.payload_xml,
    );
    return {
      ...this.toDto(declaration),
      payloadXml: declaration.payload_xml,
      signedXml: declaration.signed_xml,
      items: items.map((item) =>
        toItemDto(item, xmlItemMetadata.get(itemMetadataKey(item))),
      ),
    };
  }

  async generate(
    input: GenerateDctfwebDto,
  ): Promise<DctfwebDeclarationDetailsDto> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const kind = input.kind ?? 'ORIGINAL';
    if (kind === 'RETIFICADORA' && !input.originalDeclarationId) {
      throw new UnprocessableEntityException(
        'Retificadora must reference the original declaracao_id',
      );
    }
    const competence = competenceDate(input.year, input.month);
    const totalizers = await this.loadPublishedTotalizers(tenantId, competence);
    const mitDebits = await this.loadPendingMitDebits(tenantId, competence);
    const items = [
      ...totalizers.flatMap((row) => this.itemsFromTotalizer(row)),
      ...mitDebits.map((row) =>
        this.itemFromMitDebit(tenantId, competence, row),
      ),
    ];
    if (!items.length) {
      throw new PreconditionFailedException(
        'DCTFWeb generation requires accepted S-5011, S-5012, S-5013, EFD-Reinf R-9015 totalizers, or pending MIT tax debits for the competence',
      );
    }

    const xml = buildDctfwebXml({
      tenantId,
      competence,
      kind,
      originalDeclarationId: input.originalDeclarationId ?? null,
      items,
    });
    const xmlHash = sha256(xml);
    const payloadXmlRef = `s3://local-fiscal/${tenantId}/dctfweb/${competence}/${xmlHash}.xml`;

    const id = await this.databaseService.transaction(async (client) => {
      if (kind === 'RETIFICADORA') {
        await this.assertOriginalExists(
          client,
          input.originalDeclarationId as string,
        );
      }

      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO fiscal.dctfweb_declaration (
          tenant_id,
          competence,
          kind,
          status,
          original_declaration_id,
          payload_xml_ref,
          payload_xml,
          payload_xml_hash
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3::fiscal.dctfweb_declaration_kind,
          'DRAFT'::fiscal.dctfweb_declaration_status,
          $4::uuid,
          $5,
          $6,
          $7
        )
        RETURNING id::text
        `,
        [
          tenantId,
          competence,
          kind,
          input.originalDeclarationId ?? null,
          payloadXmlRef,
          xml,
          xmlHash,
        ],
      );
      const declarationId = inserted.rows[0]!.id;
      for (const item of items) {
        await client.query(
          `
          INSERT INTO fiscal.dctfweb_item (
            tenant_id,
            declaracao_id,
            source_event,
            source_run_id,
            debit_code,
            base_amount,
            amount,
            csll_adicional_amount
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::fiscal.dctfweb_source_event,
            $4::uuid,
            $5,
            $6::numeric(14,2),
            $7::numeric(14,2),
            $8::numeric(14,2)
          )
          `,
          [
            tenantId,
            declarationId,
            item.sourceEvent,
            item.sourceRunId,
            item.debitCode,
            item.baseAmount,
            item.amount,
            item.csllAdicionalAmount ?? '0.00',
          ],
        );
      }
      return declarationId;
    });

    return this.find(id);
  }

  private loadPublishedTotalizers(
    tenantId: string,
    competence: string,
  ): Promise<TotalizerRow[]> {
    return this.totalizerSection.loadPublishedTotalizers(tenantId, competence);
  }

  private loadPendingMitDebits(
    tenantId: string,
    competence: string,
  ): Promise<PgdTaxDebitRow[]> {
    return this.mitSection.loadPendingMitDebits(tenantId, competence);
  }

  private itemsFromTotalizer(row: TotalizerRow) {
    return this.totalizerSection.itemsFromTotalizer(row);
  }

  private itemFromMitDebit(
    tenantId: string,
    competence: string,
    row: PgdTaxDebitRow,
  ) {
    return this.mitSection.itemFromMitDebit(tenantId, competence, row);
  }

  private async assertOriginalExists(
    client: PoolClient,
    originalDeclarationId: string,
  ): Promise<void> {
    const found = await client.query(
      `
      SELECT 1
      FROM fiscal.dctfweb_declaration
      WHERE id = $1::uuid
        AND kind = 'ORIGINAL'::fiscal.dctfweb_declaration_kind
      `,
      [originalDeclarationId],
    );
    if (!found.rowCount) {
      throw new UnprocessableEntityException(
        'Retificadora must reference an existing original DCTFWeb declaration',
      );
    }
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new UnprocessableEntityException(
        'Tenant context is required for DCTFWeb',
      );
    }
    return tenantId;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for DCTFWeb operations',
      );
    }
  }

  private toDto(row: DeclarationRow): DctfwebDeclarationDto {
    return {
      id: row.id,
      competence: dateText(row.competence),
      kind: row.kind,
      status: row.status,
      originalDeclarationId: row.original_declaration_id,
      payloadXmlRef: row.payload_xml_ref,
      payloadXmlHash: row.payload_xml_hash,
      signedXmlRef: row.signed_xml_ref,
      signedXmlHash: row.signed_xml_hash,
      transmittedXmlHash: row.transmitted_xml_hash,
      receiptNumber: row.receipt_number,
      receiptAt: row.receipt_at ? new Date(row.receipt_at).toISOString() : null,
      itemCount: Number(row.item_count),
      totalBaseAmount: row.total_base_amount,
      totalAmount: row.total_amount,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}

function declarationSelectSql(where: string): string {
  return `
    SELECT
      declaration.id::text,
      declaration.competence,
      declaration.kind::text,
      declaration.status::text,
      declaration.original_declaration_id::text,
      declaration.payload_xml_ref,
      declaration.payload_xml,
      declaration.payload_xml_hash,
      declaration.signed_xml_ref,
      declaration.signed_xml,
      declaration.signed_xml_hash,
      declaration.transmitted_xml_hash,
      declaration.receipt_number,
      declaration.receipt_at,
      count(item.id)::integer AS item_count,
      COALESCE(sum(item.base_amount), 0)::numeric(14,2)::text AS total_base_amount,
      COALESCE(sum(item.amount), 0)::numeric(14,2)::text AS total_amount,
      declaration.created_at,
      declaration.updated_at
    FROM fiscal.dctfweb_declaration declaration
    LEFT JOIN fiscal.dctfweb_item item
      ON item.tenant_id = declaration.tenant_id
     AND item.declaracao_id = declaration.id
    ${where}
    GROUP BY declaration.tenant_id, declaration.id
  `;
}

function toItemDto(
  row: ItemRow,
  metadata: XmlItemMetadata = {},
): DctfwebItemDto {
  const item: DctfwebItemDto = {
    id: row.id,
    sourceEvent: row.source_event,
    sourceRunId: row.source_run_id,
    debitCode: row.debit_code,
    baseAmount: row.base_amount,
    amount: row.amount,
    csllAdicionalAmount: row.csll_adicional_amount ?? '0.00',
  };
  const mitStatus = row.mit_status ?? metadata.mitStatus;
  const mitDebitId = row.mit_debit_id ?? metadata.mitDebitId;
  const cnpjFilial = row.cnpj_filial ?? metadata.cnpjFilial;
  if (mitStatus) item.mitStatus = mitStatus;
  if (mitDebitId) item.mitDebitId = mitDebitId;
  if (cnpjFilial) item.cnpjFilial = cnpjFilial;
  return item;
}

function itemMetadataKey(row: ItemRow): string {
  return `${row.source_event}:${row.source_run_id}:${row.debit_code}`;
}
