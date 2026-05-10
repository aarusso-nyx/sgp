import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import { SgpEsocialEmittersService } from '../../../integrations/stynx-esocial';
import { CreateLeaveDto, GeneralLeaveReason } from './leaves.dto';

const LEAVE_REASONS: Record<GeneralLeaveReason, string> = {
  maternidade: 'Licenca maternidade',
  empresa_cidada_extension: 'Prorrogacao Empresa Cidada',
  paternidade: 'Licenca paternidade',
  paternidade_empresa_cidada: 'Licenca paternidade Empresa Cidada',
  adotante: 'Licenca adotante',
  premio: 'Licenca premio',
  capacitacao: 'Licenca para capacitacao',
  interesse_particular: 'Licenca para tratar de interesse particular',
  conjuge: 'Licenca para acompanhar conjuge',
  mandato_classista: 'Licenca para mandato classista',
  atividade_politica: 'Licenca para atividade politica',
  mandato_eletivo: 'Licenca para mandato eletivo',
  falecimento: 'Afastamento por falecimento',
  doacao_sangue: 'Afastamento para doacao de sangue',
  pessoa_familia: 'Afastamento por pessoa da familia',
};

const DEFAULT_DAYS: Record<GeneralLeaveReason, number> = {
  maternidade: 120,
  empresa_cidada_extension: 60,
  paternidade: 5,
  paternidade_empresa_cidada: 20,
  adotante: 120,
  premio: 90,
  capacitacao: 90,
  interesse_particular: 1,
  conjuge: 1,
  mandato_classista: 1,
  atividade_politica: 1,
  mandato_eletivo: 1,
  falecimento: 8,
  doacao_sangue: 1,
  pessoa_familia: 30,
};

interface LeaveRow extends QueryResultRow {
  id: string;
  employee_id: string;
  reason: GeneralLeaveReason;
  starts_on: Date | string;
  ends_on: Date | string;
  days: number;
  paid: boolean;
  status: string;
  notes: string;
  supporting_document_ref: string | null;
  requested_at: Date | string;
  approved_at: Date | string | null;
  approved_by: string | null;
}

interface EmployeeRow extends QueryResultRow {
  employee_id: string;
  tenant_id: string;
}

export interface GeneralLeave {
  id: string;
  employeeId: string;
  reason: GeneralLeaveReason;
  startsOn: string;
  endsOn: string;
  days: number;
  paid: boolean;
  status: string;
  notes: string;
  supportingDocumentRef: string | null;
  requestedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

@Injectable()
export class LeavesService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly esocialEmitters?: SgpEsocialEmittersService,
  ) {}

  async create(body: CreateLeaveDto): Promise<GeneralLeave> {
    this.ensureDatabase();
    const employeeId = body.employeeId ?? body.employee_id;
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }
    if (!this.isLeaveReason(body.reason)) {
      throw new BadRequestException('Unsupported leave reason');
    }

    const created = await this.databaseService.transaction(async (client) => {
      const employee = await this.loadEmployee(client, employeeId);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const empresaCidada = await this.empresaCidadaActive(client);
      const effectiveReason =
        body.reason === 'paternidade' && empresaCidada
          ? 'paternidade_empresa_cidada'
          : body.reason;
      const days =
        body.days ??
        (body.reason === 'maternidade' && empresaCidada
          ? 180
          : this.defaultDays(effectiveReason));
      const endsOn = this.addDays(body.startsOn, days - 1);
      const paid = effectiveReason !== 'interesse_particular';
      const reasonId = await this.ensureReason(
        client,
        employee.tenant_id,
        effectiveReason,
      );

      await client.query(
        `
        SELECT hr.f_validate_leave_eligibility(
          $1::uuid,
          $2::text,
          $3::date,
          $4::integer,
          NULLIF($5, '')
        )
        `,
        [
          employee.employee_id,
          effectiveReason,
          body.startsOn,
          days,
          body.supportingDocumentRef ?? '',
        ],
      );

      const result = await client.query<LeaveRow>(
        `
        INSERT INTO hr.leave_record (
          tenant_id,
          employee_id,
          absence_reason_id,
          starts_on,
          ends_on,
          days,
          paid,
          notes,
          supporting_document_ref
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::date,
          $5::date,
          $6,
          $7,
          $8,
          NULLIF($9, '')
        )
        RETURNING
          id::text,
          employee_id::text,
          $10::text AS reason,
          starts_on,
          ends_on,
          days,
          paid,
          status::text,
          notes,
          supporting_document_ref,
          requested_at,
          approved_at,
          approved_by
        `,
        [
          employee.tenant_id,
          employee.employee_id,
          reasonId,
          body.startsOn,
          endsOn,
          days,
          paid,
          body.notes ?? '',
          body.supportingDocumentRef ?? '',
          effectiveReason,
        ],
      );

      return {
        tenantId: employee.tenant_id,
        leave: this.toLeave(result.rows[0]!),
      };
    });
    await this.esocialEmitters?.s2230Leave({
      tenantId: created.tenantId,
      sourceId: created.leave.id,
      operation: 'create',
      data: {
        employeeId: created.leave.employeeId,
        reason: created.leave.reason,
        startsOn: created.leave.startsOn,
        endsOn: created.leave.endsOn,
        status: created.leave.status,
      },
    });
    return created.leave;
  }

  async listByEmployee(employeeId: string): Promise<GeneralLeave[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LeaveRow>(
      `
      SELECT
        leave_record.id::text,
        leave_record.employee_id::text,
        reason.code AS reason,
        leave_record.starts_on,
        leave_record.ends_on,
        leave_record.days,
        leave_record.paid,
        leave_record.status::text,
        leave_record.notes,
        leave_record.supporting_document_ref,
        leave_record.requested_at,
        leave_record.approved_at,
        leave_record.approved_by
      FROM hr.leave_record
      JOIN hr.absence_reason reason ON reason.id = leave_record.absence_reason_id
      WHERE leave_record.employee_id = $1::uuid
      ORDER BY leave_record.starts_on DESC, leave_record.created_at DESC
      `,
      [employeeId],
    );
    return rows.map((row) => this.toLeave(row));
  }

  async approve(id: string): Promise<GeneralLeave> {
    return this.transition(id, true);
  }

  async cancel(id: string): Promise<GeneralLeave> {
    return this.transition(id, false);
  }

  private async transition(
    id: string,
    approve: boolean,
  ): Promise<GeneralLeave> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<LeaveRow>(
      `
      UPDATE hr.leave_record AS leave_record
      SET
        approved_at = CASE WHEN $2 THEN COALESCE(approved_at, now()) ELSE approved_at END,
        approved_by = CASE WHEN $2 THEN NULLIF(current_setting('app.current_login', true), '') ELSE approved_by END,
        status = CASE WHEN $2 THEN 'ACTIVE'::"RecordStatus" ELSE 'INACTIVE'::"RecordStatus" END,
        updated_at = now()
      FROM hr.absence_reason reason
      WHERE leave_record.id = $1::uuid
        AND reason.id = leave_record.absence_reason_id
      RETURNING
        leave_record.id::text,
        leave_record.employee_id::text,
        reason.code AS reason,
        leave_record.starts_on,
        leave_record.ends_on,
        leave_record.days,
        leave_record.paid,
        leave_record.status::text,
        leave_record.notes,
        leave_record.supporting_document_ref,
        leave_record.requested_at,
        leave_record.approved_at,
        leave_record.approved_by
      `,
      [id, approve],
    );
    if (!rows[0]) {
      throw new NotFoundException('Leave request not found');
    }
    return this.toLeave(rows[0]);
  }

  private async loadEmployee(
    client: PoolClient,
    employeeId: string,
  ): Promise<EmployeeRow | null> {
    const result = await client.query<EmployeeRow>(
      `
      SELECT id::text AS employee_id, tenant_id::text
      FROM hr.employee
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
        AND status = 'ACTIVE'::"RecordStatus"
      `,
      [employeeId],
    );
    return result.rows[0] ?? null;
  }

  private async ensureReason(
    client: PoolClient,
    tenantId: string,
    reason: GeneralLeaveReason,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO hr.absence_reason (tenant_id, code, description, status)
      VALUES ($1::uuid, $2, $3, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          status = 'ACTIVE'::"RecordStatus",
          updated_at = now()
      RETURNING id::text
      `,
      [tenantId, reason, LEAVE_REASONS[reason]],
    );
    return result.rows[0]!.id;
  }

  private async empresaCidadaActive(client: PoolClient): Promise<boolean> {
    const result = await client.query<{ active: boolean }>(
      `
      SELECT COALESCE((value->>'active')::boolean, false) AS active
      FROM public.system_parameter
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND key = 'rh:empresa_cidada'
      LIMIT 1
      `,
    );
    return Boolean(result.rows[0]?.active);
  }

  private defaultDays(reason: GeneralLeaveReason): number {
    if (reason === 'maternidade') return DEFAULT_DAYS.maternidade;
    return DEFAULT_DAYS[reason];
  }

  private addDays(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private isLeaveReason(value: string): value is GeneralLeaveReason {
    return value in LEAVE_REASONS;
  }

  private toLeave(row: LeaveRow): GeneralLeave {
    return {
      id: row.id,
      employeeId: row.employee_id,
      reason: row.reason,
      startsOn: this.toDateOnly(row.starts_on),
      endsOn: this.toDateOnly(row.ends_on),
      days: Number(row.days),
      paid: Boolean(row.paid),
      status: row.status,
      notes: row.notes,
      supportingDocumentRef: row.supporting_document_ref,
      requestedAt: this.toIso(row.requested_at),
      approvedAt: row.approved_at ? this.toIso(row.approved_at) : null,
      approvedBy: row.approved_by,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for leave workflows',
      );
    }
  }

  private toDateOnly(value: Date | string): string {
    const normalized =
      value instanceof Date ? value.toISOString() : String(value);
    return normalized.slice(0, 10);
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
