import {
  BadRequestException,
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  EfdReinfEventDetailsDto,
  EfdReinfEventDto,
  EfdReinfEventType,
  GenerateEfdReinfDto,
} from './efd-reinf.dto';
import {
  AcceptedItemRow,
  EventRow,
  ItemRow,
  SourceItem,
  SourcePaymentRow,
  aggregateClosureItems,
  buildEfdReinfXml,
  competenceDate,
  dateText,
  eventSelectSql,
  moneyText,
  normalizeInputItem,
  sha256,
  sortSourceItems,
  sourcePaymentToItem,
  toItemDto,
} from './efd-reinf-builder.helpers';

export { buildEfdReinfXml } from './efd-reinf-builder.helpers';

@Injectable()
export class EfdReinfBuilderService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    year?: number,
    month?: number,
    eventType?: EfdReinfEventType,
  ): Promise<EfdReinfEventDto[]> {
    this.ensureDatabase();
    const params: unknown[] = [];
    const filters: string[] = [];
    if (year && month) {
      params.push(competenceDate(year, month));
      filters.push(`competence = $${params.length}::date`);
    }
    if (eventType) {
      params.push(eventType);
      filters.push(
        `event_type = $${params.length}::fiscal.efd_reinf_event_type`,
      );
    }
    const rows = await this.databaseService.query<EventRow>(
      `
      SELECT
        event_id::text AS id,
        competence,
        event_type::text,
        kind::text,
        status::text,
        original_event_id::text,
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
        total_gross_amount::text,
        total_retained_amount::text,
        created_at,
        updated_at
      FROM fiscal.v_efd_reinf_event_summary
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY competence DESC, event_type, created_at DESC
      `,
      params,
    );
    return rows.map((row) => this.toDto(row));
  }

  async find(id: string): Promise<EfdReinfEventDetailsDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EventRow>(
      eventSelectSql('WHERE event.id = $1::uuid'),
      [id],
    );
    const event = rows[0];
    if (!event) {
      throw new BadRequestException('EFD-Reinf event not found');
    }
    const items = await this.databaseService.query<ItemRow>(
      `
      SELECT
        id::text,
        source_run_id::text,
        beneficiary_kind::text,
        beneficiary_document,
        beneficiary_name,
        revenue_code,
        gross_amount::text,
        retained_amount::text
      FROM fiscal.efd_reinf_item
      WHERE event_id = $1::uuid
      ORDER BY beneficiary_kind, beneficiary_document, revenue_code
      `,
      [id],
    );
    return {
      ...this.toDto(event),
      payloadXml: event.payload_xml,
      signedXml: event.signed_xml,
      items: items.map(toItemDto),
    };
  }

  async generate(input: GenerateEfdReinfDto): Promise<EfdReinfEventDetailsDto> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const kind = input.kind ?? 'ORIGINAL';
    if (kind === 'RETIFICADORA' && !input.originalEventId) {
      throw new UnprocessableEntityException(
        'Retificadora must reference the original EFD-Reinf event',
      );
    }
    const competence = competenceDate(input.year, input.month);
    const items = await this.loadItems(input, tenantId, competence);
    if (!items.length) {
      throw new PreconditionFailedException(
        `EFD-Reinf ${input.eventType} generation requires source rows for the competence`,
      );
    }

    const xml = buildEfdReinfXml({
      tenantId,
      competence,
      eventType: input.eventType,
      kind,
      originalEventId: input.originalEventId ?? null,
      items,
    });
    const xmlHash = sha256(xml);
    const payloadXmlRef = `s3://local-fiscal/${tenantId}/efd-reinf/${competence}/${input.eventType}/${xmlHash}.xml`;

    const id = await this.databaseService.transaction(async (client) => {
      if (kind === 'RETIFICADORA') {
        await this.assertOriginalExists(
          client,
          input.originalEventId as string,
          input.eventType,
        );
      }
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO fiscal.efd_reinf_event (
          tenant_id,
          competence,
          event_type,
          kind,
          status,
          original_event_id,
          payload_xml_ref,
          payload_xml,
          payload_xml_hash
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3::fiscal.efd_reinf_event_type,
          $4::fiscal.efd_reinf_event_kind,
          'DRAFT'::fiscal.efd_reinf_event_status,
          $5::uuid,
          $6,
          $7,
          $8
        )
        RETURNING id::text
        `,
        [
          tenantId,
          competence,
          input.eventType,
          kind,
          input.originalEventId ?? null,
          payloadXmlRef,
          xml,
          xmlHash,
        ],
      );
      const eventId = inserted.rows[0]!.id;
      for (const item of items) {
        await client.query(
          `
          INSERT INTO fiscal.efd_reinf_item (
            tenant_id,
            event_id,
            source_run_id,
            beneficiary_kind,
            beneficiary_document,
            beneficiary_name,
            revenue_code,
            gross_amount,
            retained_amount
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::payment.dirf_beneficiary_kind,
            $5,
            $6,
            $7,
            $8::numeric(14,2),
            $9::numeric(14,2)
          )
          `,
          [
            tenantId,
            eventId,
            item.sourceRunId,
            item.beneficiaryKind,
            item.beneficiaryDocument,
            item.beneficiaryName,
            item.revenueCode,
            item.grossAmount,
            item.retainedAmount,
          ],
        );
      }
      return eventId;
    });

    return this.find(id);
  }

  private async loadItems(
    input: GenerateEfdReinfDto,
    tenantId: string,
    competence: string,
  ): Promise<SourceItem[]> {
    const explicit = (input.items ?? []).map((item, index) =>
      normalizeInputItem(item, input.eventType, competence, index),
    );
    if (input.eventType === 'R4099') {
      const accepted = await this.loadAcceptedR4000Items(tenantId, competence);
      return aggregateClosureItems([...accepted, ...explicit]);
    }
    if (input.eventType === 'R4040' || input.eventType === 'R4080') {
      return sortSourceItems(explicit);
    }
    const rows = await this.loadSourcePayments(input.eventType, competence);
    return sortSourceItems([...rows.map(sourcePaymentToItem), ...explicit]);
  }

  private async loadSourcePayments(
    eventType: EfdReinfEventType,
    competence: string,
  ): Promise<SourcePaymentRow[]> {
    const beneficiaryKind = eventType === 'R4010' ? 'CPF' : 'CNPJ';
    return this.databaseService.query<SourcePaymentRow>(
      `
      SELECT
        id::text,
        beneficiary_kind::text,
        beneficiary_document,
        beneficiary_name,
        revenue_code,
        amount::text,
        irrf::text
      FROM payment.dirf_payment_source
      WHERE month_year = $1::date
        AND beneficiary_kind = $2::payment.dirf_beneficiary_kind
      ORDER BY beneficiary_document, revenue_code, id
      `,
      [competence, beneficiaryKind],
    );
  }

  private async loadAcceptedR4000Items(
    tenantId: string,
    competence: string,
  ): Promise<SourceItem[]> {
    const rows = await this.databaseService.query<AcceptedItemRow>(
      `
      SELECT
        item.source_run_id::text,
        item.beneficiary_kind::text,
        item.beneficiary_document,
        item.beneficiary_name,
        item.revenue_code,
        item.gross_amount::text,
        item.retained_amount::text
      FROM fiscal.efd_reinf_item item
      JOIN fiscal.efd_reinf_event event
        ON event.tenant_id = item.tenant_id
       AND event.id = item.event_id
      WHERE event.tenant_id = $1::uuid
        AND event.competence = $2::date
        AND event.event_type IN (
          'R4010'::fiscal.efd_reinf_event_type,
          'R4020'::fiscal.efd_reinf_event_type,
          'R4040'::fiscal.efd_reinf_event_type,
          'R4080'::fiscal.efd_reinf_event_type
        )
        AND event.status = 'ACCEPTED'::fiscal.efd_reinf_event_status
      ORDER BY item.revenue_code, item.beneficiary_document
      `,
      [tenantId, competence],
    );
    return rows.map((row) => ({
      sourceRunId: row.source_run_id,
      beneficiaryKind: row.beneficiary_kind,
      beneficiaryDocument: row.beneficiary_document,
      beneficiaryName: row.beneficiary_name,
      revenueCode: row.revenue_code,
      grossAmount: moneyText(row.gross_amount),
      retainedAmount: moneyText(row.retained_amount),
    }));
  }

  private async assertOriginalExists(
    client: PoolClient,
    originalEventId: string,
    eventType: EfdReinfEventType,
  ): Promise<void> {
    const found = await client.query(
      `
      SELECT 1
      FROM fiscal.efd_reinf_event
      WHERE id = $1::uuid
        AND event_type = $2::fiscal.efd_reinf_event_type
        AND kind = 'ORIGINAL'::fiscal.efd_reinf_event_kind
      `,
      [originalEventId, eventType],
    );
    if (!found.rowCount) {
      throw new UnprocessableEntityException(
        'Retificadora must reference an existing original EFD-Reinf event',
      );
    }
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new UnprocessableEntityException(
        'Tenant context is required for EFD-Reinf',
      );
    }
    return tenantId;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for EFD-Reinf operations',
      );
    }
  }

  private toDto(row: EventRow): EfdReinfEventDto {
    return {
      id: row.id,
      competence: dateText(row.competence),
      eventType: row.event_type,
      kind: row.kind,
      status: row.status,
      originalEventId: row.original_event_id,
      payloadXmlRef: row.payload_xml_ref,
      payloadXmlHash: row.payload_xml_hash,
      signedXmlRef: row.signed_xml_ref,
      signedXmlHash: row.signed_xml_hash,
      transmittedXmlHash: row.transmitted_xml_hash,
      receiptNumber: row.receipt_number,
      receiptAt: row.receipt_at ? new Date(row.receipt_at).toISOString() : null,
      itemCount: Number(row.item_count),
      totalGrossAmount: row.total_gross_amount,
      totalRetainedAmount: row.total_retained_amount,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
