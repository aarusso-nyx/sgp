import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  LgpdDsarListQueryDto,
  LgpdDsarStatus,
  LgpdDsarTriageOutcome,
  UpdateLgpdDsarDto,
} from './dsar.dto';
import { LgpdRightType } from '../portal/lgpd-rights.dto';

interface LgpdDsarRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  flow_key: string;
  right_type: LgpdRightType;
  status: LgpdDsarStatus;
  request_description: string;
  requested_by_sub: string;
  requested_by_login: string;
  data_subject_employee_id: string | null;
  sla_started_at: Date | string;
  sla_due_at: Date | string;
  triage_outcome: LgpdDsarTriageOutcome;
  retention_rule_snapshot: string;
  sharing_scope_snapshot: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LgpdDsarTicketDto {
  id: string;
  flowKey: string;
  rightType: LgpdRightType;
  status: LgpdDsarStatus;
  descriptionPreview: string;
  requesterRef: string;
  dataSubjectEmployeeRef: string | null;
  sla: {
    startedAt: string;
    dueAt: string;
    status: 'OPEN' | 'DUE_SOON' | 'OVERDUE' | 'CLOSED';
  };
  triage: {
    outcome: LgpdDsarTriageOutcome;
    retentionRule: string;
    sharingScope: string;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class LgpdDsarAdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: LgpdDsarListQueryDto,
  ): Promise<{ items: LgpdDsarTicketDto[] }> {
    this.ensureDatabase();
    const filters: string[] = [];
    const values: unknown[] = [];

    if (query.status) {
      values.push(query.status);
      filters.push(
        `request.status = $${values.length}::lgpd.data_subject_request_status`,
      );
    }
    if (query.flowKey) {
      values.push(query.flowKey);
      filters.push(`request.flow_key = $${values.length}`);
    }

    const rows = await this.databaseService.query<LgpdDsarRow>(
      `
      SELECT
        request.id::text,
        request.tenant_id::text,
        request.flow_key,
        request.right_type,
        request.status,
        request.request_description,
        request.requested_by_sub,
        request.requested_by_login,
        request.data_subject_employee_id::text,
        request.sla_started_at,
        request.sla_due_at,
        request.triage_outcome,
        request.retention_rule_snapshot,
        request.sharing_scope_snapshot,
        request.created_at,
        request.updated_at
      FROM lgpd.data_subject_request request
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY request.sla_due_at ASC, request.created_at ASC
      LIMIT 100
      `,
      values,
    );

    return { items: rows.map((row) => this.mapRow(row)) };
  }

  async update(
    id: string,
    payload: UpdateLgpdDsarDto,
  ): Promise<LgpdDsarTicketDto> {
    this.ensureDatabase();
    if (!payload.status && !payload.triageOutcome) {
      throw new BadRequestException(
        'At least one DSAR lifecycle field is required',
      );
    }

    const assignments: string[] = ['updated_at = now()'];
    const values: unknown[] = [id];

    if (payload.status) {
      values.push(payload.status);
      assignments.push(
        `status = $${values.length}::lgpd.data_subject_request_status`,
      );
    }
    if (payload.triageOutcome) {
      values.push(payload.triageOutcome);
      assignments.push(
        `triage_outcome = $${values.length}::lgpd.data_subject_triage_outcome`,
      );
    }

    const rows = await this.databaseService.query<LgpdDsarRow>(
      `
      UPDATE lgpd.data_subject_request request
      SET ${assignments.join(', ')}
      WHERE request.id = $1::uuid
      RETURNING
        request.id::text,
        request.tenant_id::text,
        request.flow_key,
        request.right_type,
        request.status,
        request.request_description,
        request.requested_by_sub,
        request.requested_by_login,
        request.data_subject_employee_id::text,
        request.sla_started_at,
        request.sla_due_at,
        request.triage_outcome,
        request.retention_rule_snapshot,
        request.sharing_scope_snapshot,
        request.created_at,
        request.updated_at
      `,
      values,
    );

    const row = rows[0];
    if (!row) {
      throw new BadRequestException('LGPD DSAR ticket was not found');
    }

    return this.mapRow(row);
  }

  private mapRow(row: LgpdDsarRow): LgpdDsarTicketDto {
    return {
      id: row.id,
      flowKey: row.flow_key,
      rightType: row.right_type,
      status: row.status,
      descriptionPreview: this.preview(row.request_description),
      requesterRef: this.stableRef(
        row.requested_by_sub,
        row.requested_by_login,
      ),
      dataSubjectEmployeeRef: row.data_subject_employee_id
        ? this.stableRef(row.data_subject_employee_id)
        : null,
      sla: {
        startedAt: this.toIso(row.sla_started_at),
        dueAt: this.toIso(row.sla_due_at),
        status: this.slaStatus(row.status, row.sla_due_at),
      },
      triage: {
        outcome: row.triage_outcome,
        retentionRule: row.retention_rule_snapshot,
        sharingScope: row.sharing_scope_snapshot,
      },
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private preview(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 160) return normalized;
    return `${normalized.slice(0, 157)}...`;
  }

  private stableRef(...parts: string[]): string {
    return createHash('sha256').update(parts.join(':')).digest('hex');
  }

  private slaStatus(
    status: LgpdDsarStatus,
    dueAtValue: Date | string,
  ): LgpdDsarTicketDto['sla']['status'] {
    if (
      status === 'ANSWERED' ||
      status === 'REJECTED' ||
      status === 'CANCELLED'
    ) {
      return 'CLOSED';
    }

    const dueAt = new Date(dueAtValue).getTime();
    const now = Date.now();
    if (dueAt < now) return 'OVERDUE';
    if (dueAt - now <= 7 * 24 * 60 * 60 * 1000) return 'DUE_SOON';
    return 'OPEN';
  }

  private ensureDatabase() {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for LGPD DSAR administration',
      );
    }
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
