import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { AuthenticatedActor } from '../auth/actor.types';
import { LgpdLegalBasisService } from '../common/lgpd/legal-basis.service';
import { DatabaseService } from '../database/database.service';
import { CreateLgpdRightsRequestDto, LgpdRightType } from './lgpd-rights.dto';

interface RopaTicketBasisRow extends QueryResultRow {
  ropa_entry_id: string;
  legal_basis_rule_id: string;
  retention_rule: string;
  sharing_scope: string;
}

interface LgpdRightsTicketRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  flow_key: string;
  right_type: LgpdRightType;
  status: string;
  request_description: string;
  requested_by_sub: string;
  requested_by_login: string;
  data_subject_employee_id: string | null;
  sla_started_at: Date | string;
  sla_due_at: Date | string;
  triage_outcome: string;
  retention_rule_snapshot: string;
  sharing_scope_snapshot: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LgpdRightsTicketDto {
  id: string;
  tenantId: string;
  flowKey: string;
  rightType: LgpdRightType;
  status: string;
  description: string;
  requestedBy: {
    sub: string;
    login: string;
  };
  dataSubjectEmployeeId: string | null;
  sla: {
    startedAt: string;
    dueAt: string;
  };
  triage: {
    outcome: string;
    retentionRule: string;
    sharingScope: string;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class LgpdRightsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly legalBasisService: LgpdLegalBasisService,
  ) {}

  async create(
    actor: AuthenticatedActor | undefined,
    payload: CreateLgpdRightsRequestDto,
  ): Promise<LgpdRightsTicketDto> {
    this.ensureDatabase();
    this.ensureActor(actor);
    await this.legalBasisService.assertPiiReadAllowed(payload.flowKey);

    const basis = await this.loadActiveRopaBasis(payload.flowKey);
    const triageOutcome = this.triageOutcome(payload.rightType);
    const rows = await this.databaseService.query<LgpdRightsTicketRow>(
      `
      INSERT INTO lgpd.data_subject_request (
        tenant_id,
        ropa_entry_id,
        legal_basis_rule_id,
        flow_key,
        right_type,
        request_description,
        requested_by_sub,
        requested_by_login,
        data_subject_employee_id,
        triage_outcome,
        retention_rule_snapshot,
        sharing_scope_snapshot
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::uuid,
        $9,
        $10,
        $11
      )
      RETURNING
        id::text,
        tenant_id::text,
        flow_key,
        right_type,
        status,
        request_description,
        requested_by_sub,
        requested_by_login,
        data_subject_employee_id::text,
        sla_started_at,
        sla_due_at,
        triage_outcome,
        retention_rule_snapshot,
        sharing_scope_snapshot,
        created_at,
        updated_at
      `,
      [
        basis.ropa_entry_id,
        basis.legal_basis_rule_id,
        payload.flowKey,
        payload.rightType,
        payload.description,
        actor.sub,
        actor.username,
        this.employeeId(actor),
        triageOutcome,
        basis.retention_rule,
        basis.sharing_scope,
      ],
    );

    const row = rows[0];
    if (!row) {
      throw new ServiceUnavailableException(
        'LGPD rights request ticket was not created',
      );
    }
    return this.mapRow(row);
  }

  private async loadActiveRopaBasis(
    flowKey: string,
  ): Promise<RopaTicketBasisRow> {
    const rows = await this.databaseService.query<RopaTicketBasisRow>(
      `
      SELECT
        entry.id::text AS ropa_entry_id,
        entry.legal_basis_rule_id::text,
        rule.retention_rule,
        rule.sharing_scope
      FROM lgpd.ropa_entry entry
      JOIN lgpd.legal_basis_rule rule ON rule.id = entry.legal_basis_rule_id
      WHERE entry.flow_key = $1
        AND entry.status = 'ACTIVE'
        AND rule.status = 'ACTIVE'
        AND rule.effective_from <= CURRENT_DATE
        AND (rule.effective_until IS NULL OR rule.effective_until >= CURRENT_DATE)
      ORDER BY entry.updated_at DESC
      LIMIT 1
      `,
      [flowKey],
    );
    const row = rows[0];
    if (!row) {
      throw new BadRequestException(
        'LGPD flow does not have an active ROPA entry',
      );
    }
    return row;
  }

  private triageOutcome(rightType: LgpdRightType) {
    if (
      rightType === 'ANONYMIZATION_BLOCKING_DELETION' ||
      rightType === 'CONSENT_DELETION'
    ) {
      return 'RETENTION_RESTRICTED';
    }
    return 'EXECUTABLE';
  }

  private ensureDatabase() {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }

  private ensureActor(actor: AuthenticatedActor | undefined): asserts actor {
    if (!actor?.sub || !actor.username) {
      throw new UnauthorizedException('Authenticated portal actor is required');
    }
  }

  private employeeId(actor: AuthenticatedActor | undefined): string | null {
    const value = actor?.claims?.['employee_id'];
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private mapRow(row: LgpdRightsTicketRow): LgpdRightsTicketDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      flowKey: row.flow_key,
      rightType: row.right_type,
      status: row.status,
      description: row.request_description,
      requestedBy: {
        sub: row.requested_by_sub,
        login: row.requested_by_login,
      },
      dataSubjectEmployeeId: row.data_subject_employee_id,
      sla: {
        startedAt: this.toIso(row.sla_started_at),
        dueAt: this.toIso(row.sla_due_at),
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

  private toIso(value: Date | string) {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
