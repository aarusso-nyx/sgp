import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { LgpdLegalBasisService } from '../common/lgpd/legal-basis.service';
import {
  CreateRopaEntryDto,
  RopaListQueryDto,
  UpdateRopaEntryDto,
} from './ropa.dto';

interface RopaEntryRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  flow_key: string;
  operation_name: string;
  controller_area: string;
  processor_name: string | null;
  external_recipients: string[];
  security_controls: string[];
  lifecycle_evidence: string[];
  risk_level: string;
  status: string;
  review_due_at: Date | string | null;
  notes: string | null;
  international_transfer: boolean | null;
  created_at: Date | string;
  updated_at: Date | string;
  flow_name: string;
  data_category: string;
  legal_basis_code: string;
  sensitive_basis_code: string | null;
  purpose: string;
  data_subjects: string[];
  data_categories: string[];
  source_tables: string[];
  read_surfaces: string[];
  retention_rule: string;
  sharing_scope: string;
  requires_consent: boolean;
  requires_dpia: boolean;
  decision_record_anchor: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

export interface RopaEntryDto {
  id: string;
  tenantId: string;
  flowKey: string;
  operationName: string;
  controllerArea: string;
  processorName: string | null;
  externalRecipients: string[];
  securityControls: string[];
  lifecycleEvidence: string[];
  riskLevel: string;
  status: string;
  reviewDueAt: string | null;
  notes: string | null;
  internationalTransfer: boolean;
  createdAt: string;
  updatedAt: string;
  legalBasis: {
    flowName: string;
    dataCategory: string;
    legalBasisCode: string;
    sensitiveBasisCode: string | null;
    purpose: string;
    dataSubjects: string[];
    dataCategories: string[];
    sourceTables: string[];
    readSurfaces: string[];
    retentionRule: string;
    sharingScope: string;
    requiresConsent: boolean;
    requiresDpia: boolean;
    decisionRecordAnchor: string;
  };
}

const ROPA_SELECT = `
  SELECT
    entry.id,
    entry.tenant_id,
    entry.flow_key,
    entry.operation_name,
    entry.controller_area,
    entry.processor_name,
    entry.external_recipients,
    entry.security_controls,
    entry.lifecycle_evidence,
    entry.risk_level,
    entry.status,
    entry.review_due_at,
    entry.notes,
    entry.international_transfer,
    entry.created_at,
    entry.updated_at,
    rule.flow_name,
    rule.data_category,
    rule.legal_basis_code,
    rule.sensitive_basis_code,
    rule.purpose,
    rule.data_subjects,
    rule.data_categories,
    rule.source_tables,
    rule.read_surfaces,
    rule.retention_rule,
    rule.sharing_scope,
    rule.requires_consent,
    rule.requires_dpia,
    rule.decision_record_anchor
  FROM lgpd.ropa_entry entry
  JOIN lgpd.legal_basis_rule rule ON rule.id = entry.legal_basis_rule_id
`;

@Injectable()
export class LgpdRopaService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly legalBasisService: LgpdLegalBasisService,
  ) {}

  async list(query: RopaListQueryDto = {}): Promise<{ items: RopaEntryDto[] }> {
    this.ensureDatabase();
    const filters: string[] = [];
    const values: unknown[] = [];
    if (query.flowKey) {
      values.push(query.flowKey);
      filters.push(`entry.flow_key = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      filters.push(`entry.status = $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await this.databaseService.query<RopaEntryRow>(
      `
      ${ROPA_SELECT}
      ${where}
      ORDER BY entry.flow_key ASC, entry.operation_name ASC
      `,
      values,
    );

    return { items: rows.map((row) => this.mapRow(row)) };
  }

  async create(payload: CreateRopaEntryDto): Promise<RopaEntryDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    await this.legalBasisService.assertPiiReadAllowed(payload.flowKey);

    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO lgpd.ropa_entry (
        tenant_id,
        legal_basis_rule_id,
        flow_key,
        operation_name,
        controller_area,
        processor_name,
        external_recipients,
        international_transfer,
        security_controls,
        lifecycle_evidence,
        risk_level,
        status,
        review_due_at,
        notes
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        rule.id,
        rule.flow_key,
        $2,
        $3,
        $4,
        $5::text[],
        $6,
        $7::text[],
        $8::text[],
        $9,
        $10,
        $11::date,
        $12
      FROM lgpd.legal_basis_rule rule
      WHERE rule.flow_key = $1
        AND rule.status = 'ACTIVE'
        AND rule.effective_from <= CURRENT_DATE
        AND (rule.effective_until IS NULL OR rule.effective_until >= CURRENT_DATE)
      RETURNING id
      `,
      [
        payload.flowKey,
        payload.operationName,
        payload.controllerArea,
        payload.processorName ?? null,
        payload.externalRecipients ?? [],
        payload.internationalTransfer ?? false,
        payload.securityControls ?? [],
        payload.lifecycleEvidence ?? [],
        payload.riskLevel ?? 'MEDIUM',
        payload.status ?? 'ACTIVE',
        payload.reviewDueAt ?? null,
        payload.notes ?? null,
      ],
    );

    const id = rows[0]?.id;
    if (!id) {
      throw new BadRequestException('LGPD legal basis is not active');
    }
    return this.getById(id);
  }

  async update(id: string, payload: UpdateRopaEntryDto): Promise<RopaEntryDto> {
    this.ensureDatabase();
    this.ensureTenantContext();

    if (payload.flowKey) {
      await this.legalBasisService.assertPiiReadAllowed(payload.flowKey);
    }

    const values: unknown[] = [];
    const assignments: string[] = [];
    const add = (column: string, value: unknown, cast = '') => {
      values.push(value);
      assignments.push(`${column} = $${values.length}${cast}`);
    };

    if (payload.flowKey !== undefined) {
      values.push(payload.flowKey);
      const param = `$${values.length}`;
      assignments.push(`flow_key = ${param}`);
      assignments.push(
        `legal_basis_rule_id = (SELECT rule.id FROM lgpd.legal_basis_rule rule WHERE rule.flow_key = ${param} AND rule.status = 'ACTIVE' AND rule.effective_from <= CURRENT_DATE AND (rule.effective_until IS NULL OR rule.effective_until >= CURRENT_DATE))`,
      );
    }
    if (payload.operationName !== undefined) {
      add('operation_name', payload.operationName);
    }
    if (payload.controllerArea !== undefined) {
      add('controller_area', payload.controllerArea);
    }
    if (payload.processorName !== undefined) {
      add('processor_name', payload.processorName);
    }
    if (payload.externalRecipients !== undefined) {
      add('external_recipients', payload.externalRecipients, '::text[]');
    }
    if (payload.internationalTransfer !== undefined) {
      add('international_transfer', payload.internationalTransfer);
    }
    if (payload.securityControls !== undefined) {
      add('security_controls', payload.securityControls, '::text[]');
    }
    if (payload.lifecycleEvidence !== undefined) {
      add('lifecycle_evidence', payload.lifecycleEvidence, '::text[]');
    }
    if (payload.riskLevel !== undefined) {
      add('risk_level', payload.riskLevel);
    }
    if (payload.status !== undefined) {
      add('status', payload.status);
    }
    if (payload.reviewDueAt !== undefined) {
      add('review_due_at', payload.reviewDueAt, '::date');
    }
    if (payload.notes !== undefined) {
      add('notes', payload.notes);
    }

    if (!assignments.length) {
      return this.getById(id);
    }

    values.push(id);
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE lgpd.ropa_entry
      SET ${assignments.join(', ')}
      WHERE id = $${values.length}
      RETURNING id
      `,
      values,
    );
    if (!rows[0]) {
      throw new NotFoundException('ROPA entry not found');
    }
    return this.getById(id);
  }

  private async getById(id: string): Promise<RopaEntryDto> {
    const rows = await this.databaseService.query<RopaEntryRow>(
      `
      ${ROPA_SELECT}
      WHERE entry.id = $1
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('ROPA entry not found');
    }
    return this.mapRow(row);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private ensureTenantContext(): void {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required for ROPA');
    }
  }

  private mapRow(row: RopaEntryRow): RopaEntryDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      flowKey: row.flow_key,
      operationName: row.operation_name,
      controllerArea: row.controller_area,
      processorName: row.processor_name,
      externalRecipients: row.external_recipients,
      securityControls: row.security_controls,
      lifecycleEvidence: row.lifecycle_evidence,
      riskLevel: row.risk_level,
      status: row.status,
      reviewDueAt: this.toIsoDate(row.review_due_at),
      notes: row.notes,
      internationalTransfer: Boolean(row.international_transfer),
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
      legalBasis: {
        flowName: row.flow_name,
        dataCategory: row.data_category,
        legalBasisCode: row.legal_basis_code,
        sensitiveBasisCode: row.sensitive_basis_code,
        purpose: row.purpose,
        dataSubjects: row.data_subjects,
        dataCategories: row.data_categories,
        sourceTables: row.source_tables,
        readSurfaces: row.read_surfaces,
        retentionRule: row.retention_rule,
        sharingScope: row.sharing_scope,
        requiresConsent: row.requires_consent,
        requiresDpia: row.requires_dpia,
        decisionRecordAnchor: row.decision_record_anchor,
      },
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private toIsoDate(value: Date | string | null): string | null {
    if (!value) return null;
    return this.toIso(value).slice(0, 10);
  }
}
