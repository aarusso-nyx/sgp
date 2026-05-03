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
  CreateLgpdPublicPowerTreatmentDto,
  LgpdPublicPowerTreatmentListQueryDto,
  LgpdPublicPowerTreatmentStatus,
  UpdateLgpdPublicPowerTreatmentDto,
} from './public-power.dto';

interface PublicPowerSourceRow extends QueryResultRow {
  ropa_entry_id: string;
  legal_basis_rule_id: string;
  flow_key: string;
  controller_area: string;
  purpose: string;
  legal_basis_article: string;
  legal_basis_code: string;
  sensitive_basis_article: string | null;
  sensitive_basis_code: string | null;
  decision_record_anchor: string;
  retention_rule: string;
  sharing_scope: string;
}

interface PublicPowerTreatmentRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  ropa_entry_id: string;
  legal_basis_rule_id: string;
  flow_key: string;
  purpose: string;
  legal_basis_reference: string;
  responsible_area: string;
  evidence_refs: string[];
  status: LgpdPublicPowerTreatmentStatus;
  notes: string | null;
  created_by_ref: string | null;
  updated_by_ref: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  legal_basis_code: string;
  legal_basis_article: string;
  sensitive_basis_code: string | null;
  sensitive_basis_article: string | null;
  decision_record_anchor: string;
  retention_rule: string;
  sharing_scope: string;
  ropa_operation_name: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

export interface LgpdPublicPowerTreatmentDto {
  id: string;
  tenantId: string;
  ropaEntryId: string;
  legalBasisRuleId: string;
  flowKey: string;
  purpose: string;
  legalBasisReference: string;
  responsibleArea: string;
  evidenceRefs: string[];
  status: LgpdPublicPowerTreatmentStatus;
  notes: string | null;
  createdByRef: string | null;
  updatedByRef: string | null;
  createdAt: string;
  updatedAt: string;
  ropa: {
    operationName: string;
  };
  legalBasis: {
    legalBasisCode: string;
    legalBasisArticle: string;
    sensitiveBasisCode: string | null;
    sensitiveBasisArticle: string | null;
    decisionRecordAnchor: string;
    retentionRule: string;
    sharingScope: string;
  };
}

const PUBLIC_POWER_SELECT = `
  SELECT
    treatment.id,
    treatment.tenant_id,
    treatment.ropa_entry_id,
    treatment.legal_basis_rule_id,
    treatment.flow_key,
    treatment.purpose,
    treatment.legal_basis_reference,
    treatment.responsible_area,
    treatment.evidence_refs,
    treatment.status,
    treatment.notes,
    treatment.created_by_ref,
    treatment.updated_by_ref,
    treatment.created_at,
    treatment.updated_at,
    entry.operation_name AS ropa_operation_name,
    rule.legal_basis_code,
    rule.legal_basis_article,
    rule.sensitive_basis_code,
    rule.sensitive_basis_article,
    rule.decision_record_anchor,
    rule.retention_rule,
    rule.sharing_scope
  FROM lgpd.public_power_treatment treatment
  JOIN lgpd.ropa_entry entry ON entry.id = treatment.ropa_entry_id
  JOIN lgpd.legal_basis_rule rule ON rule.id = treatment.legal_basis_rule_id
`;

@Injectable()
export class LgpdPublicPowerTreatmentService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: LgpdPublicPowerTreatmentListQueryDto = {},
  ): Promise<{ items: LgpdPublicPowerTreatmentDto[] }> {
    this.ensureDatabase();
    const filters: string[] = [];
    const values: unknown[] = [];
    if (query.status) {
      values.push(query.status);
      filters.push(`treatment.status = $${values.length}`);
    }
    if (query.flowKey) {
      values.push(query.flowKey);
      filters.push(`treatment.flow_key = $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await this.databaseService.query<PublicPowerTreatmentRow>(
      `
      ${PUBLIC_POWER_SELECT}
      ${where}
      ORDER BY treatment.updated_at DESC, treatment.created_at DESC
      `,
      values,
    );

    return { items: rows.map((row) => this.mapRow(row)) };
  }

  async create(
    payload: CreateLgpdPublicPowerTreatmentDto,
  ): Promise<LgpdPublicPowerTreatmentDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    const source = await this.resolveSource(
      payload.ropaEntryId,
      payload.flowKey,
    );

    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO lgpd.public_power_treatment (
        tenant_id,
        ropa_entry_id,
        legal_basis_rule_id,
        flow_key,
        purpose,
        legal_basis_reference,
        responsible_area,
        evidence_refs,
        status,
        notes,
        created_by_ref,
        updated_by_ref
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        $7::text[],
        $8,
        $9,
        $10,
        $10
      )
      RETURNING id
      `,
      [
        source.ropa_entry_id,
        source.legal_basis_rule_id,
        source.flow_key,
        this.requiredText(payload.purpose ?? source.purpose, 'purpose'),
        this.requiredText(
          payload.legalBasisReference ?? this.formatLegalBasis(source),
          'legalBasisReference',
        ),
        this.requiredText(
          payload.responsibleArea ?? source.controller_area,
          'responsibleArea',
        ),
        payload.evidenceRefs ?? [source.decision_record_anchor],
        payload.status ?? 'REGISTERED',
        payload.notes?.trim() ?? null,
        this.actorRef(),
      ],
    );

    return this.getById(rows[0]!.id);
  }

  async update(
    id: string,
    payload: UpdateLgpdPublicPowerTreatmentDto,
  ): Promise<LgpdPublicPowerTreatmentDto> {
    this.ensureDatabase();
    this.ensureTenantContext();

    const values: unknown[] = [];
    const assignments: string[] = [];
    const add = (column: string, value: unknown, cast = '') => {
      values.push(value);
      assignments.push(`${column} = $${values.length}${cast}`);
    };

    if (payload.purpose !== undefined) {
      add('purpose', this.requiredText(payload.purpose, 'purpose'));
    }
    if (payload.legalBasisReference !== undefined) {
      add(
        'legal_basis_reference',
        this.requiredText(payload.legalBasisReference, 'legalBasisReference'),
      );
    }
    if (payload.responsibleArea !== undefined) {
      add(
        'responsible_area',
        this.requiredText(payload.responsibleArea, 'responsibleArea'),
      );
    }
    if (payload.evidenceRefs !== undefined) {
      add('evidence_refs', payload.evidenceRefs, '::text[]');
    }
    if (payload.status !== undefined) {
      add('status', payload.status);
    }
    if (payload.notes !== undefined) {
      add('notes', payload.notes?.trim() ?? null);
    }

    if (!assignments.length) {
      return this.getById(id);
    }

    add('updated_by_ref', this.actorRef());
    values.push(id);
    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE lgpd.public_power_treatment
      SET ${assignments.join(', ')}
      WHERE id = $${values.length}
      RETURNING id
      `,
      values,
    );
    if (!rows[0]) {
      throw new NotFoundException('LGPD public-power treatment not found');
    }
    return this.getById(id);
  }

  private async resolveSource(
    ropaEntryId: string | undefined,
    flowKey: string | undefined,
  ): Promise<PublicPowerSourceRow> {
    if (!ropaEntryId && !flowKey) {
      throw new BadRequestException(
        'ROPA entry or flow key is required for LGPD public-power treatment',
      );
    }

    const filters: string[] = [];
    const values: unknown[] = [];
    if (ropaEntryId) {
      values.push(ropaEntryId);
      filters.push(`entry.id = $${values.length}`);
    }
    if (flowKey) {
      values.push(flowKey);
      filters.push(`entry.flow_key = $${values.length}`);
    }

    const rows = await this.databaseService.query<PublicPowerSourceRow>(
      `
      SELECT
        entry.id AS ropa_entry_id,
        entry.legal_basis_rule_id,
        entry.flow_key,
        entry.controller_area,
        rule.purpose,
        rule.legal_basis_article,
        rule.legal_basis_code,
        rule.sensitive_basis_article,
        rule.sensitive_basis_code,
        rule.decision_record_anchor,
        rule.retention_rule,
        rule.sharing_scope
      FROM lgpd.ropa_entry entry
      JOIN lgpd.legal_basis_rule rule ON rule.id = entry.legal_basis_rule_id
      WHERE ${filters.join(' AND ')}
        AND entry.status <> 'RETIRED'
        AND rule.status = 'ACTIVE'
        AND rule.effective_from <= CURRENT_DATE
        AND (rule.effective_until IS NULL OR rule.effective_until >= CURRENT_DATE)
      ORDER BY entry.updated_at DESC
      LIMIT 1
      `,
      values,
    );

    const source = rows[0];
    if (!source) {
      throw new BadRequestException(
        'Active ROPA entry for LGPD public-power treatment not found',
      );
    }
    return source;
  }

  private async getById(id: string): Promise<LgpdPublicPowerTreatmentDto> {
    const rows = await this.databaseService.query<PublicPowerTreatmentRow>(
      `
      ${PUBLIC_POWER_SELECT}
      WHERE treatment.id = $1
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('LGPD public-power treatment not found');
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
      throw new BadRequestException(
        'Tenant context is required for LGPD public-power treatment',
      );
    }
  }

  private actorRef(): string | null {
    const context = RequestContextStore.get();
    return context?.actor?.username ?? context?.actor?.sub ?? null;
  }

  private formatLegalBasis(source: PublicPowerSourceRow): string {
    return [source.legal_basis_article, source.sensitive_basis_article]
      .filter(Boolean)
      .join(' + ');
  }

  private requiredText(value: string, fieldName: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return trimmed;
  }

  private mapRow(row: PublicPowerTreatmentRow): LgpdPublicPowerTreatmentDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      ropaEntryId: row.ropa_entry_id,
      legalBasisRuleId: row.legal_basis_rule_id,
      flowKey: row.flow_key,
      purpose: row.purpose,
      legalBasisReference: row.legal_basis_reference,
      responsibleArea: row.responsible_area,
      evidenceRefs: row.evidence_refs,
      status: row.status,
      notes: row.notes,
      createdByRef: row.created_by_ref,
      updatedByRef: row.updated_by_ref,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
      ropa: {
        operationName: row.ropa_operation_name,
      },
      legalBasis: {
        legalBasisCode: row.legal_basis_code,
        legalBasisArticle: row.legal_basis_article,
        sensitiveBasisCode: row.sensitive_basis_code,
        sensitiveBasisArticle: row.sensitive_basis_article,
        decisionRecordAnchor: row.decision_record_anchor,
        retentionRule: row.retention_rule,
        sharingScope: row.sharing_scope,
      },
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
