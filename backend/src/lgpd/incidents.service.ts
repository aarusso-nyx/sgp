import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { addBusinessDays } from './incidents.business-days';
import {
  CloseLgpdIncidentDto,
  ComplementLgpdIncidentDto,
  CreateLgpdIncidentDto,
  LgpdIncidentListQueryDto,
  LgpdIncidentSeverity,
  LgpdIncidentStatus,
  ReportLgpdIncidentDto,
  TriageLgpdIncidentDto,
} from './incidents.dto';

interface IncidentSourceRow extends QueryResultRow {
  ropa_entry_id: string;
  legal_basis_rule_id: string;
  flow_key: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface SecurityIncidentRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  ropa_entry_id: string | null;
  legal_basis_rule_id: string | null;
  flow_key: string | null;
  status: LgpdIncidentStatus;
  severity: LgpdIncidentSeverity;
  summary: string;
  detected_at: Date | string;
  personal_data_confirmed_at: Date | string | null;
  anpd_due_at: Date | string | null;
  anpd_alert_at: Date | string | null;
  anpd_reported_at: Date | string | null;
  complement_due_at: Date | string | null;
  complemented_at: Date | string | null;
  closed_at: Date | string | null;
  affected_data_nature: string | null;
  affected_data_categories: string[];
  affected_subjects_estimate: number | null;
  affected_children_estimate: number | null;
  affected_elderly_estimate: number | null;
  risk_relevant: boolean;
  risk_assessment: string | null;
  mitigation_measures: string[];
  controller_contact: string | null;
  anpd_protocol: string | null;
  titular_communication_summary: string | null;
  complement_summary: string | null;
  closure_reason: string | null;
  created_by_ref: string | null;
  triaged_by_ref: string | null;
  reported_by_ref: string | null;
  complemented_by_ref: string | null;
  closed_by_ref: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  ropa_operation_name: string | null;
  legal_basis_data_category: string | null;
  requires_dpia: boolean | null;
  sharing_scope: string | null;
}

export interface LgpdSecurityIncidentDto {
  id: string;
  tenantId: string;
  ropaEntryId: string | null;
  legalBasisRuleId: string | null;
  flowKey: string | null;
  status: LgpdIncidentStatus;
  severity: LgpdIncidentSeverity;
  summary: string;
  detectedAt: string;
  personalDataConfirmedAt: string | null;
  anpdDueAt: string | null;
  anpdAlertAt: string | null;
  anpdReportedAt: string | null;
  complementDueAt: string | null;
  complementedAt: string | null;
  closedAt: string | null;
  affectedDataNature: string | null;
  affectedDataCategories: string[];
  affectedSubjectsEstimate: number | null;
  affectedChildrenEstimate: number | null;
  affectedElderlyEstimate: number | null;
  riskRelevant: boolean;
  riskAssessment: string | null;
  mitigationMeasures: string[];
  controllerContact: string | null;
  anpdProtocol: string | null;
  titularCommunicationSummary: string | null;
  complementSummary: string | null;
  closureReason: string | null;
  createdByRef: string | null;
  triagedByRef: string | null;
  reportedByRef: string | null;
  complementedByRef: string | null;
  closedByRef: string | null;
  createdAt: string;
  updatedAt: string;
  requiresAnpdAlert: boolean;
  isAnpdOverdue: boolean;
  ropa: {
    operationName: string | null;
    dataCategory: string | null;
    requiresDpia: boolean | null;
    sharingScope: string | null;
  };
}

const INCIDENT_SELECT = `
  SELECT
    incident.id,
    incident.tenant_id,
    incident.ropa_entry_id,
    incident.legal_basis_rule_id,
    incident.flow_key,
    incident.status,
    incident.severity,
    incident.summary,
    incident.detected_at,
    incident.personal_data_confirmed_at,
    incident.anpd_due_at,
    incident.anpd_alert_at,
    incident.anpd_reported_at,
    incident.complement_due_at,
    incident.complemented_at,
    incident.closed_at,
    incident.affected_data_nature,
    incident.affected_data_categories,
    incident.affected_subjects_estimate,
    incident.affected_children_estimate,
    incident.affected_elderly_estimate,
    incident.risk_relevant,
    incident.risk_assessment,
    incident.mitigation_measures,
    incident.controller_contact,
    incident.anpd_protocol,
    incident.titular_communication_summary,
    incident.complement_summary,
    incident.closure_reason,
    incident.created_by_ref,
    incident.triaged_by_ref,
    incident.reported_by_ref,
    incident.complemented_by_ref,
    incident.closed_by_ref,
    incident.created_at,
    incident.updated_at,
    entry.operation_name AS ropa_operation_name,
    rule.data_category AS legal_basis_data_category,
    rule.requires_dpia,
    rule.sharing_scope
  FROM lgpd.security_incident incident
  LEFT JOIN lgpd.ropa_entry entry ON entry.id = incident.ropa_entry_id
  LEFT JOIN lgpd.legal_basis_rule rule ON rule.id = incident.legal_basis_rule_id
`;

@Injectable()
export class LgpdSecurityIncidentService {
  private readonly logger = new Logger(LgpdSecurityIncidentService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: LgpdIncidentListQueryDto = {},
  ): Promise<{ items: LgpdSecurityIncidentDto[] }> {
    this.ensureDatabase();
    const filters: string[] = [];
    const values: unknown[] = [];
    if (query.status) {
      values.push(query.status);
      filters.push(`incident.status = $${values.length}`);
    }
    if (query.flowKey) {
      values.push(query.flowKey);
      filters.push(`incident.flow_key = $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await this.databaseService.query<SecurityIncidentRow>(
      `
      ${INCIDENT_SELECT}
      ${where}
      ORDER BY incident.anpd_due_at ASC NULLS LAST, incident.detected_at DESC
      `,
      values,
    );
    return { items: rows.map((row) => this.mapRow(row)) };
  }

  async create(
    payload: CreateLgpdIncidentDto,
  ): Promise<LgpdSecurityIncidentDto> {
    this.ensureDatabase();
    this.ensureTenantContext();
    const source = await this.resolveIncidentSource(
      payload.ropaEntryId,
      payload.flowKey,
    );
    const personalDataConfirmedAt = payload.personalDataConfirmedAt
      ? new Date(payload.personalDataConfirmedAt)
      : null;
    const due = personalDataConfirmedAt
      ? addBusinessDays(personalDataConfirmedAt, 3)
      : null;
    const alert = personalDataConfirmedAt
      ? addBusinessDays(personalDataConfirmedAt, 2)
      : null;

    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO lgpd.security_incident (
        tenant_id,
        ropa_entry_id,
        legal_basis_rule_id,
        flow_key,
        status,
        severity,
        summary,
        detected_at,
        personal_data_confirmed_at,
        anpd_due_at,
        anpd_alert_at,
        affected_data_nature,
        affected_data_categories,
        affected_subjects_estimate,
        created_by_ref
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3,
        'DETECTED',
        $4,
        $5,
        COALESCE($6::timestamptz, CURRENT_TIMESTAMP),
        $7::timestamptz,
        $8::timestamptz,
        $9::timestamptz,
        $10,
        $11::text[],
        $12,
        $13
      )
      RETURNING id
      `,
      [
        source?.ropa_entry_id ?? null,
        source?.legal_basis_rule_id ?? null,
        source?.flow_key ?? payload.flowKey ?? null,
        payload.severity ?? 'MEDIUM',
        payload.summary,
        payload.detectedAt ?? null,
        personalDataConfirmedAt?.toISOString() ?? null,
        due?.toISOString() ?? null,
        alert?.toISOString() ?? null,
        payload.affectedDataNature ?? null,
        payload.affectedDataCategories ?? [],
        payload.affectedSubjectsEstimate ?? null,
        this.actorRef(),
      ],
    );

    const incident = await this.getById(rows[0]!.id);
    this.logTransition('CREATE', null, incident);
    return incident;
  }

  async triage(
    id: string,
    payload: TriageLgpdIncidentDto,
  ): Promise<LgpdSecurityIncidentDto> {
    const previous = await this.requireStatus(id, 'DETECTED');
    const confirmedAt = new Date(payload.personalDataConfirmedAt);
    const due = addBusinessDays(confirmedAt, 3);
    const alert = addBusinessDays(confirmedAt, 2);
    await this.updateForTransition(id, 'DETECTED', 'TRIAGED', [
      [
        'personal_data_confirmed_at',
        confirmedAt.toISOString(),
        '::timestamptz',
      ],
      ['anpd_due_at', due.toISOString(), '::timestamptz'],
      ['anpd_alert_at', alert.toISOString(), '::timestamptz'],
      ['affected_data_nature', payload.affectedDataNature],
      ['affected_data_categories', payload.affectedDataCategories, '::text[]'],
      ['affected_subjects_estimate', payload.affectedSubjectsEstimate ?? null],
      ['affected_children_estimate', payload.affectedChildrenEstimate ?? null],
      ['affected_elderly_estimate', payload.affectedElderlyEstimate ?? null],
      ['risk_relevant', payload.riskRelevant],
      ['severity', payload.severity],
      ['risk_assessment', payload.riskAssessment],
      ['mitigation_measures', payload.mitigationMeasures, '::text[]'],
      ['triaged_by_ref', this.actorRef()],
    ]);
    const incident = await this.getById(id);
    this.logTransition('TRIAGE', previous.status, incident);
    return incident;
  }

  async report(
    id: string,
    payload: ReportLgpdIncidentDto,
  ): Promise<LgpdSecurityIncidentDto> {
    const previous = await this.requireStatus(id, 'TRIAGED');
    const reportedAt = payload.reportedAt
      ? new Date(payload.reportedAt)
      : new Date();
    const complementDue = addBusinessDays(reportedAt, 20);
    await this.updateForTransition(id, 'TRIAGED', 'REPORTED', [
      ['anpd_reported_at', reportedAt.toISOString(), '::timestamptz'],
      ['complement_due_at', complementDue.toISOString(), '::timestamptz'],
      ['anpd_protocol', payload.anpdProtocol],
      ['controller_contact', payload.controllerContact],
      [
        'titular_communication_summary',
        payload.titularCommunicationSummary ?? null,
      ],
      ['reported_by_ref', this.actorRef()],
    ]);
    const incident = await this.getById(id);
    this.logTransition('REPORT', previous.status, incident);
    return incident;
  }

  async complement(
    id: string,
    payload: ComplementLgpdIncidentDto,
  ): Promise<LgpdSecurityIncidentDto> {
    const previous = await this.requireStatus(id, 'REPORTED');
    await this.updateForTransition(id, 'REPORTED', 'COMPLEMENTED', [
      [
        'complemented_at',
        payload.complementedAt ?? new Date().toISOString(),
        '::timestamptz',
      ],
      ['complement_summary', payload.complementSummary],
      ['mitigation_measures', payload.mitigationMeasures ?? null, '::text[]'],
      ['complemented_by_ref', this.actorRef()],
    ]);
    const incident = await this.getById(id);
    this.logTransition('COMPLEMENT', previous.status, incident);
    return incident;
  }

  async close(
    id: string,
    payload: CloseLgpdIncidentDto,
  ): Promise<LgpdSecurityIncidentDto> {
    const previous = await this.requireStatus(id, 'COMPLEMENTED');
    await this.updateForTransition(id, 'COMPLEMENTED', 'CLOSED', [
      [
        'closed_at',
        payload.closedAt ?? new Date().toISOString(),
        '::timestamptz',
      ],
      ['closure_reason', payload.closureReason],
      ['closed_by_ref', this.actorRef()],
    ]);
    const incident = await this.getById(id);
    this.logTransition('CLOSE', previous.status, incident);
    return incident;
  }

  private async resolveIncidentSource(
    ropaEntryId: string | undefined,
    flowKey: string | undefined,
  ): Promise<IncidentSourceRow | null> {
    if (!ropaEntryId && !flowKey) return null;

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

    const rows = await this.databaseService.query<IncidentSourceRow>(
      `
      SELECT
        entry.id AS ropa_entry_id,
        entry.legal_basis_rule_id,
        entry.flow_key
      FROM lgpd.ropa_entry entry
      JOIN lgpd.legal_basis_rule rule ON rule.id = entry.legal_basis_rule_id
      WHERE ${filters.join(' AND ')}
        AND entry.status <> 'RETIRED'
        AND rule.status = 'ACTIVE'
      ORDER BY entry.updated_at DESC
      LIMIT 1
      `,
      values,
    );

    if (!rows[0]) {
      throw new BadRequestException(
        'LGPD incident source ROPA entry not found',
      );
    }
    return rows[0];
  }

  private async requireStatus(
    id: string,
    expected: LgpdIncidentStatus,
  ): Promise<LgpdSecurityIncidentDto> {
    const incident = await this.getById(id);
    if (incident.status !== expected) {
      throw new BadRequestException(
        `Invalid LGPD incident transition ${incident.status} -> ${expected}`,
      );
    }
    return incident;
  }

  private async updateForTransition(
    id: string,
    expectedStatus: LgpdIncidentStatus,
    nextStatus: LgpdIncidentStatus,
    assignments: [string, unknown, string?][],
  ): Promise<void> {
    const values: unknown[] = [id, nextStatus, expectedStatus];
    const setClauses = ['status = $2'];
    for (const [column, value, cast = ''] of assignments) {
      if (column === 'mitigation_measures' && value === null) continue;
      values.push(value);
      setClauses.push(`${column} = $${values.length}${cast}`);
    }

    const rows = await this.databaseService.query<IdRow>(
      `
      UPDATE lgpd.security_incident
      SET ${setClauses.join(', ')}
      WHERE id = $1
        AND status = $3
      RETURNING id
      `,
      values,
    );
    if (!rows[0]) {
      throw new BadRequestException(
        `Invalid LGPD incident transition ${expectedStatus} -> ${nextStatus}`,
      );
    }
  }

  private async getById(id: string): Promise<LgpdSecurityIncidentDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<SecurityIncidentRow>(
      `
      ${INCIDENT_SELECT}
      WHERE incident.id = $1
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('LGPD security incident not found');
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
        'Tenant context is required for LGPD incidents',
      );
    }
  }

  private actorRef(): string | null {
    const context = RequestContextStore.get();
    return context?.actor?.username ?? context?.actor?.sub ?? null;
  }

  private mapRow(row: SecurityIncidentRow): LgpdSecurityIncidentDto {
    const anpdDueAt = this.toIsoNullable(row.anpd_due_at);
    const anpdAlertAt = this.toIsoNullable(row.anpd_alert_at);
    const now = Date.now();
    return {
      id: row.id,
      tenantId: row.tenant_id,
      ropaEntryId: row.ropa_entry_id,
      legalBasisRuleId: row.legal_basis_rule_id,
      flowKey: row.flow_key,
      status: row.status,
      severity: row.severity,
      summary: row.summary,
      detectedAt: this.toIso(row.detected_at),
      personalDataConfirmedAt: this.toIsoNullable(
        row.personal_data_confirmed_at,
      ),
      anpdDueAt,
      anpdAlertAt,
      anpdReportedAt: this.toIsoNullable(row.anpd_reported_at),
      complementDueAt: this.toIsoNullable(row.complement_due_at),
      complementedAt: this.toIsoNullable(row.complemented_at),
      closedAt: this.toIsoNullable(row.closed_at),
      affectedDataNature: row.affected_data_nature,
      affectedDataCategories: row.affected_data_categories,
      affectedSubjectsEstimate: row.affected_subjects_estimate,
      affectedChildrenEstimate: row.affected_children_estimate,
      affectedElderlyEstimate: row.affected_elderly_estimate,
      riskRelevant: row.risk_relevant,
      riskAssessment: row.risk_assessment,
      mitigationMeasures: row.mitigation_measures,
      controllerContact: row.controller_contact,
      anpdProtocol: row.anpd_protocol,
      titularCommunicationSummary: row.titular_communication_summary,
      complementSummary: row.complement_summary,
      closureReason: row.closure_reason,
      createdByRef: row.created_by_ref,
      triagedByRef: row.triaged_by_ref,
      reportedByRef: row.reported_by_ref,
      complementedByRef: row.complemented_by_ref,
      closedByRef: row.closed_by_ref,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
      requiresAnpdAlert:
        row.status === 'TRIAGED' &&
        !row.anpd_reported_at &&
        Boolean(anpdAlertAt && Date.parse(anpdAlertAt) <= now),
      isAnpdOverdue:
        row.status === 'TRIAGED' &&
        !row.anpd_reported_at &&
        Boolean(anpdDueAt && Date.parse(anpdDueAt) < now),
      ropa: {
        operationName: row.ropa_operation_name,
        dataCategory: row.legal_basis_data_category,
        requiresDpia: row.requires_dpia,
        sharingScope: row.sharing_scope,
      },
    };
  }

  private logTransition(
    action: string,
    fromStatus: LgpdIncidentStatus | null,
    incident: LgpdSecurityIncidentDto,
  ): void {
    this.logger.log({
      event: 'lgpd_rcis_security_incident',
      action,
      incidentId: incident.id,
      fromStatus,
      toStatus: incident.status,
      flowKey: incident.flowKey,
      severity: incident.severity,
      riskRelevant: incident.riskRelevant,
      anpdDueAt: incident.anpdDueAt,
      complementDueAt: incident.complementDueAt,
    });
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private toIsoNullable(value: Date | string | null): string | null {
    if (!value) return null;
    return this.toIso(value);
  }
}

export { addBusinessDays } from './incidents.business-days';
