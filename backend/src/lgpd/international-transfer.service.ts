import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import {
  ApproveInternationalTransferDto,
  CloseInternationalTransferDto,
  CreateInternationalTransferDto,
  InternationalTransferListQueryDto,
  InternationalTransferMechanism,
  InternationalTransferStatus,
  SubmitInternationalTransferDto,
  UpdateInternationalTransferDto,
} from './international-transfer.dto';

interface IdRow extends QueryResultRow {
  id: string;
}

interface TransferRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  ropa_entry_id: string | null;
  flow_key: string;
  origin_country: string;
  origin_region: string | null;
  destination_country: string;
  destination_region: string | null;
  destination_country_name: string | null;
  recognized_by_anpd: boolean | null;
  adequacy_decision_ref: string | null;
  processor_name: string;
  purpose: string;
  data_categories: string[];
  mechanism: InternationalTransferMechanism;
  mechanism_reference: string;
  safeguards: string[];
  dpo_approval_ref: string | null;
  status: InternationalTransferStatus;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  review_due_at: Date | string | null;
  legal_citation: string;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface EventRow extends QueryResultRow {
  id: string;
}

export interface InternationalTransferDto {
  id: string;
  tenantId: string;
  ropaEntryId: string | null;
  flowKey: string;
  origin: {
    country: string;
    region: string | null;
  };
  destination: {
    country: string;
    countryName: string | null;
    region: string | null;
    recognizedByAnpd: boolean;
    adequacyDecisionRef: string | null;
  };
  processorName: string;
  purpose: string;
  dataCategories: string[];
  mechanism: InternationalTransferMechanism;
  mechanismReference: string;
  safeguards: string[];
  dpoApprovalRef: string | null;
  status: InternationalTransferStatus;
  startsAt: string | null;
  endsAt: string | null;
  reviewDueAt: string | null;
  legalCitation: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const TRANSFER_SELECT = `
  SELECT
    transfer.id::text,
    transfer.tenant_id::text,
    transfer.ropa_entry_id::text,
    transfer.flow_key,
    transfer.origin_country,
    transfer.origin_region,
    transfer.destination_country,
    transfer.destination_region,
    country.country_name AS destination_country_name,
    country.recognized_by_anpd,
    country.adequacy_decision_ref,
    transfer.processor_name,
    transfer.purpose,
    transfer.data_categories,
    transfer.mechanism,
    transfer.mechanism_reference,
    transfer.safeguards,
    transfer.dpo_approval_ref,
    transfer.status,
    transfer.starts_at,
    transfer.ends_at,
    transfer.review_due_at,
    transfer.legal_citation,
    transfer.notes,
    transfer.created_at,
    transfer.updated_at
  FROM lgpd.international_transfer transfer
  LEFT JOIN lgpd.international_transfer_country_adequacy country
    ON country.country_code = transfer.destination_country
`;

@Injectable()
export class InternationalTransferService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: InternationalTransferListQueryDto = {},
  ): Promise<{ items: InternationalTransferDto[] }> {
    this.ensureDatabase();
    const filters: string[] = [];
    const values: unknown[] = [];
    if (query.status) {
      values.push(query.status);
      filters.push(`transfer.status = $${values.length}`);
    }
    if (query.flowKey) {
      values.push(query.flowKey);
      filters.push(`transfer.flow_key = $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await this.databaseService.query<TransferRow>(
      `
      ${TRANSFER_SELECT}
      ${where}
      ORDER BY transfer.status = 'ACTIVE' DESC, transfer.review_due_at ASC NULLS LAST, transfer.created_at DESC
      `,
      values,
    );
    return { items: rows.map((row) => this.mapRow(row)) };
  }

  async create(
    payload: CreateInternationalTransferDto,
  ): Promise<InternationalTransferDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    this.assertMechanism(payload.mechanism, payload.destinationCountry);
    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO lgpd.international_transfer (
        tenant_id,
        ropa_entry_id,
        flow_key,
        origin_country,
        origin_region,
        destination_country,
        destination_region,
        processor_name,
        purpose,
        data_categories,
        mechanism,
        mechanism_reference,
        safeguards,
        review_due_at,
        notes,
        created_by_ref
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::text[],
        $10,
        $11,
        $12::text[],
        $13::date,
        $14,
        $15
      )
      RETURNING id::text
      `,
      [
        payload.ropaEntryId ?? null,
        payload.flowKey,
        payload.originCountry ?? 'BR',
        payload.originRegion ?? null,
        payload.destinationCountry.toUpperCase(),
        payload.destinationRegion ?? null,
        payload.processorName,
        payload.purpose,
        payload.dataCategories ?? [],
        payload.mechanism,
        payload.mechanismReference,
        payload.safeguards ?? [],
        payload.reviewDueAt ?? null,
        payload.notes ?? null,
        this.actorRef(),
      ],
    );
    return this.getById(rows[0]!.id);
  }

  async update(
    id: string,
    payload: UpdateInternationalTransferDto,
  ): Promise<InternationalTransferDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    const current = await this.getById(id);
    if (current.status !== 'DRAFT' && current.status !== 'DPO_REVIEW') {
      throw new BadRequestException(
        'Only draft or DPO-review transfers can be updated',
      );
    }
    const mechanism = payload.mechanism ?? current.mechanism;
    const destinationCountry =
      payload.destinationCountry?.toUpperCase() ?? current.destination.country;
    this.assertMechanism(mechanism, destinationCountry);

    const values: unknown[] = [];
    const assignments: string[] = [];
    const add = (column: string, value: unknown, cast = '') => {
      values.push(value);
      assignments.push(`${column} = $${values.length}${cast}`);
    };

    if (payload.ropaEntryId !== undefined) {
      add('ropa_entry_id', payload.ropaEntryId, '::uuid');
    }
    if (payload.flowKey !== undefined) add('flow_key', payload.flowKey);
    if (payload.destinationCountry !== undefined) {
      add('destination_country', destinationCountry);
    }
    if (payload.destinationRegion !== undefined) {
      add('destination_region', payload.destinationRegion);
    }
    if (payload.processorName !== undefined) {
      add('processor_name', payload.processorName);
    }
    if (payload.purpose !== undefined) add('purpose', payload.purpose);
    if (payload.dataCategories !== undefined) {
      add('data_categories', payload.dataCategories, '::text[]');
    }
    if (payload.mechanism !== undefined) add('mechanism', payload.mechanism);
    if (payload.mechanismReference !== undefined) {
      add('mechanism_reference', payload.mechanismReference);
    }
    if (payload.safeguards !== undefined) {
      add('safeguards', payload.safeguards, '::text[]');
    }
    if (payload.reviewDueAt !== undefined) {
      add('review_due_at', payload.reviewDueAt, '::date');
    }
    if (payload.notes !== undefined) add('notes', payload.notes);

    if (!assignments.length) return current;
    values.push(id);
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE lgpd.international_transfer
      SET ${assignments.join(', ')}
      WHERE id = $${values.length}::uuid
      RETURNING id::text
      `,
      values,
    );
    if (!rows[0])
      throw new NotFoundException('International transfer not found');
    return this.getById(id);
  }

  async submitForDpoReview(
    id: string,
    payload: SubmitInternationalTransferDto,
  ): Promise<InternationalTransferDto> {
    const options: { notes?: string; reviewedByRef?: string } = {};
    if (payload.notes !== undefined) options.notes = payload.notes;
    const reviewedByRef = this.actorRef();
    if (reviewedByRef) options.reviewedByRef = reviewedByRef;
    return this.transition(id, 'DPO_REVIEW', options);
  }

  async approve(
    id: string,
    payload: ApproveInternationalTransferDto,
  ): Promise<InternationalTransferDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    const current = await this.getById(id);
    if (current.status !== 'DPO_REVIEW') {
      throw new BadRequestException('Transfer must be in DPO review');
    }
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE lgpd.international_transfer
      SET
        status = 'ACTIVE',
        dpo_approval_ref = $2,
        starts_at = $3::date,
        activated_by_ref = $4,
        notes = COALESCE(notes, '')
      WHERE id = $1::uuid
      RETURNING id::text
      `,
      [id, payload.dpoApprovalRef, payload.startsAt, this.actorRef()],
    );
    if (!rows[0])
      throw new NotFoundException('International transfer not found');
    return this.getById(id);
  }

  async close(
    id: string,
    payload: CloseInternationalTransferDto,
  ): Promise<InternationalTransferDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    const current = await this.getById(id);
    if (current.status !== 'ACTIVE') {
      throw new BadRequestException('Only active transfers can be closed');
    }
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE lgpd.international_transfer
      SET
        status = 'CLOSED',
        ends_at = $2::date,
        closed_by_ref = $3,
        notes = COALESCE($4, notes)
      WHERE id = $1::uuid
      RETURNING id::text
      `,
      [id, payload.endsAt, this.actorRef(), payload.notes ?? null],
    );
    if (!rows[0])
      throw new NotFoundException('International transfer not found');
    return this.getById(id);
  }

  async recordDetectedEvent(input: {
    flowKey: string;
    processorName: string;
    destinationCountry: string;
    destinationRegion?: string | null;
    requestPath?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    dataCategories?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<string | null> {
    if (!this.databaseService.configured) return null;
    const rows = await this.databaseService.query<EventRow>(
      `
      WITH active_transfer AS (
        SELECT id
        FROM lgpd.international_transfer
        WHERE flow_key = $1
          AND lower(processor_name) = lower($2)
          AND destination_country = $3
          AND status = 'ACTIVE'
          AND (starts_at IS NULL OR starts_at <= CURRENT_DATE)
          AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
        ORDER BY updated_at DESC
        LIMIT 1
      )
      INSERT INTO lgpd.international_transfer_event (
        tenant_id,
        international_transfer_id,
        flow_key,
        processor_name,
        destination_country,
        destination_region,
        request_path,
        resource_type,
        resource_id,
        data_categories,
        metadata
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        active_transfer.id,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::text[],
        $9::jsonb
      FROM active_transfer
      RETURNING id::text
      `,
      [
        input.flowKey,
        input.processorName,
        input.destinationCountry.toUpperCase(),
        input.destinationRegion ?? null,
        input.requestPath ?? null,
        input.resourceType ?? null,
        input.resourceId ?? null,
        input.dataCategories ?? [],
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return rows[0]?.id ?? null;
  }

  private async transition(
    id: string,
    status: InternationalTransferStatus,
    options: { notes?: string; reviewedByRef?: string },
  ): Promise<InternationalTransferDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    const current = await this.getById(id);
    if (current.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft transfers can enter DPO review',
      );
    }
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE lgpd.international_transfer
      SET
        status = $2,
        notes = COALESCE($3, notes),
        reviewed_by_ref = $4
      WHERE id = $1::uuid
      RETURNING id::text
      `,
      [id, status, options.notes ?? null, options.reviewedByRef ?? null],
    );
    if (!rows[0])
      throw new NotFoundException('International transfer not found');
    return this.getById(id);
  }

  private async getById(id: string): Promise<InternationalTransferDto> {
    const rows = await this.databaseService.query<TransferRow>(
      `
      ${TRANSFER_SELECT}
      WHERE transfer.id = $1::uuid
      LIMIT 1
      `,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('International transfer not found');
    return this.mapRow(row);
  }

  private assertMechanism(
    mechanism: InternationalTransferMechanism,
    destinationCountry: string,
  ): void {
    if (
      mechanism === 'ADEQUACY_DECISION' &&
      destinationCountry.toUpperCase().length < 2
    ) {
      throw new BadRequestException(
        'Adequacy decision requires a country code',
      );
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private ensureTenantContext(): void {
    if (!RequestContextStore.get()?.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
  }

  private actorRef(): string | null {
    const context = RequestContextStore.get();
    return context?.actor?.username ?? context?.actor?.sub ?? null;
  }

  private mapRow(row: TransferRow): InternationalTransferDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      ropaEntryId: row.ropa_entry_id,
      flowKey: row.flow_key,
      origin: {
        country: row.origin_country,
        region: row.origin_region,
      },
      destination: {
        country: row.destination_country,
        countryName: row.destination_country_name,
        region: row.destination_region,
        recognizedByAnpd: Boolean(row.recognized_by_anpd),
        adequacyDecisionRef: row.adequacy_decision_ref,
      },
      processorName: row.processor_name,
      purpose: row.purpose,
      dataCategories: row.data_categories ?? [],
      mechanism: row.mechanism,
      mechanismReference: row.mechanism_reference,
      safeguards: row.safeguards ?? [],
      dpoApprovalRef: row.dpo_approval_ref,
      status: row.status,
      startsAt: this.dateValue(row.starts_at),
      endsAt: this.dateValue(row.ends_at),
      reviewDueAt: this.dateValue(row.review_due_at),
      legalCitation: row.legal_citation,
      notes: row.notes,
      createdAt: this.isoValue(row.created_at),
      updatedAt: this.isoValue(row.updated_at),
    };
  }

  private dateValue(value: Date | string | null): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private isoValue(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
