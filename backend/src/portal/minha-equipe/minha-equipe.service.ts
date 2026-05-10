import { BadRequestException, Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { AuthenticatedActor } from '../../auth/actor.types';
import { DatabaseService } from '../../database/database.service';
import { FeriasService } from '../ferias/ferias.service';
import { LicencasService } from '../licencas/licencas.service';
import { MeusDadosService } from '../meus-dados/meus-dados.service';

interface ApprovalQueueRow extends QueryResultRow {
  kind: 'leave' | 'vacation';
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  title: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  days: number | null;
  status: string;
  requested_at: Date | string;
}

@Injectable()
export class MinhaEquipeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly meusDadosService: MeusDadosService,
    private readonly licencasService: LicencasService,
    private readonly feriasService: FeriasService,
  ) {}

  async approvalQueue(actor: AuthenticatedActor | undefined) {
    const employee = await this.meusDadosService.loadEmployee(actor);
    const rows = await this.databaseService.query<ApprovalQueueRow>(
      `
      WITH manager AS (
        SELECT
          $1::uuid AS id,
          NULLIF($2, '')::uuid AS branch_id,
          NULLIF($3, '')::uuid AS work_location_id,
          NULLIF($4, '')::uuid AS cost_center_id
      ),
      leave_queue AS (
        SELECT
          'leave'::text AS kind,
          leave_record.id::text,
          target.id::text AS employee_id,
          target.registration AS employee_registration,
          target.name AS employee_name,
          COALESCE(reason.description, 'Licenca') AS title,
          leave_record.starts_on,
          leave_record.ends_on,
          leave_record.days,
          leave_record.status::text,
          leave_record.requested_at
        FROM manager
        JOIN hr.employee target ON target.tenant_id = public.sgp_current_tenant_uuid()
        JOIN hr.leave_record leave_record
          ON leave_record.tenant_id = target.tenant_id
         AND leave_record.employee_id = target.id
        LEFT JOIN hr.absence_reason reason
          ON reason.tenant_id = leave_record.tenant_id
         AND reason.id = leave_record.absence_reason_id
        WHERE target.id <> manager.id
          AND leave_record.approved_at IS NULL
          AND leave_record.status = 'ACTIVE'::"RecordStatus"
          AND (
            (manager.cost_center_id IS NOT NULL AND target.cost_center_id = manager.cost_center_id)
            OR (manager.work_location_id IS NOT NULL AND target.work_location_id = manager.work_location_id)
            OR (manager.branch_id IS NOT NULL AND target.branch_id = manager.branch_id)
          )
      ),
      vacation_queue AS (
        SELECT
          'vacation'::text AS kind,
          vacation.id::text,
          target.id::text AS employee_id,
          target.registration AS employee_registration,
          target.name AS employee_name,
          'Ferias'::text AS title,
          vacation.starts_on,
          vacation.ends_on,
          vacation.days,
          vacation.status::text,
          vacation.created_at AS requested_at
        FROM manager
        JOIN hr.employee target ON target.tenant_id = public.sgp_current_tenant_uuid()
        JOIN hr.vacation_record vacation
          ON vacation.tenant_id = target.tenant_id
         AND vacation.employee_id = target.id
        WHERE target.id <> manager.id
          AND vacation.status = 'programado'
          AND (
            (manager.cost_center_id IS NOT NULL AND target.cost_center_id = manager.cost_center_id)
            OR (manager.work_location_id IS NOT NULL AND target.work_location_id = manager.work_location_id)
            OR (manager.branch_id IS NOT NULL AND target.branch_id = manager.branch_id)
          )
      )
      SELECT *
      FROM (
        SELECT * FROM leave_queue
        UNION ALL
        SELECT * FROM vacation_queue
      ) queue
      ORDER BY requested_at ASC, employee_name ASC
      LIMIT 100
      `,
      [
        employee.id,
        employee.branch_id ?? '',
        employee.work_location_id ?? '',
        employee.cost_center_id ?? '',
      ],
    );
    return rows.map((row) => ({
      kind: row.kind,
      id: row.id,
      employeeId: row.employee_id,
      employeeRegistration: row.employee_registration,
      employeeName: row.employee_name,
      title: row.title,
      startsOn: this.meusDadosService.toDate(row.starts_on),
      endsOn: row.ends_on ? this.meusDadosService.toDate(row.ends_on) : null,
      days: row.days,
      status: row.status,
      requestedAt: this.meusDadosService.toIso(row.requested_at),
    }));
  }

  async transitionApproval(
    actor: AuthenticatedActor | undefined,
    kind: string,
    id: string,
    action: 'approve' | 'cancel',
  ) {
    await this.meusDadosService.loadEmployee(actor);
    if (kind === 'leave') {
      return this.licencasService.transitionLeave(id, action === 'approve');
    }
    if (kind === 'vacation') {
      return this.feriasService.transitionVacation(id, action === 'approve');
    }
    throw new BadRequestException('Unsupported approval kind');
  }
}
