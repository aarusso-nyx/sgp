import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  CreateAbsenceJustificationDto,
  DecideAbsenceJustificationDto,
} from '../ponto.dto';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import { JustificationWorkflowService } from './justification-workflow.service';
import {
  AbsenceJustification,
  AbsenceJustificationStatus,
} from './justification.types';

interface JustificationRow extends QueryResultRow {
  absence_justification_id: string;
  employee_id: string;
  kind: string;
  absence_start: Date | string;
  absence_end: Date | string;
  status: string;
  reason: string;
  attachment_id: string | null;
  requested_by_user_id: string;
  approved_by_user_id: string | null;
  decided_at: Date | string | null;
  payroll_treatment: string;
  medical_leave_id: string | null;
}

@Injectable()
export class JustificationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly workflowService: JustificationWorkflowService,
  ) {}

  async list(status?: string): Promise<AbsenceJustification[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<JustificationRow>(
      `
      SELECT absence_justification_id::text, employee_id::text, kind::text, absence_start,
             absence_end, status::text, reason, attachment_id::text, requested_by_user_id::text,
             approved_by_user_id::text, decided_at, payroll_treatment::text, medical_leave_id::text
      FROM ponto.absence_justification
      WHERE ($1::text IS NULL OR status::text = $1)
      ORDER BY absence_start DESC, created_at DESC
      `,
      [status ?? null],
    );
    return rows.map((row) => this.toModel(row));
  }

  async request(
    input: CreateAbsenceJustificationDto,
  ): Promise<AbsenceJustification> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const rows = await client.query<JustificationRow>(
        `
        INSERT INTO ponto.absence_justification (
          employee_id,
          kind,
          absence_start,
          absence_end,
          reason,
          attachment_id,
          requested_by_user_id,
          payroll_treatment
        )
        VALUES (
          $1::uuid,
          $2::ponto.absence_justification_kind,
          $3::timestamptz,
          $4::timestamptz,
          $5,
          NULLIF($6, '')::uuid,
          $7::uuid,
          COALESCE($8::ponto.absence_payroll_treatment, 'PAID'::ponto.absence_payroll_treatment)
        )
        RETURNING absence_justification_id::text, employee_id::text, kind::text, absence_start,
                  absence_end, status::text, reason, attachment_id::text, requested_by_user_id::text,
                  approved_by_user_id::text, decided_at, payroll_treatment::text, medical_leave_id::text
        `,
        [
          input.employeeId,
          input.kind,
          input.absenceStart,
          input.absenceEnd,
          input.reason.trim(),
          input.attachmentId ?? '',
          input.requestedByUserId,
          input.payrollTreatment ?? 'PAID',
        ],
      );
      return this.toModel(rows.rows[0]);
    });
  }

  async decide(
    id: string,
    input: DecideAbsenceJustificationDto,
  ): Promise<AbsenceJustification> {
    this.ensureDatabase();
    return this.workflowService.withTransaction(async (client) => {
      const current = await this.loadForUpdate(client, id);
      this.workflowService.assertTransition(
        current.status as AbsenceJustificationStatus,
        input.decision as AbsenceJustificationStatus,
      );
      await this.workflowService.assertApproverAboveEmployee(
        client,
        current.employee_id,
        input.approverUserId,
      );

      let medicalLeaveId = current.medical_leave_id;
      if (input.decision === 'APPROVED' && current.kind === 'MEDICAL') {
        const handoffId = await this.workflowService.createMedicalLeaveHandoff(
          client,
          {
            employeeId: current.employee_id,
            absenceStart: formatInstantIso(current.absence_start),
            absenceEnd: formatInstantIso(current.absence_end),
            attachmentId: current.attachment_id,
            justificationId: current.absence_justification_id,
          },
        );
        medicalLeaveId = handoffId || medicalLeaveId;
      }

      const rows = await client.query<JustificationRow>(
        `
        UPDATE ponto.absence_justification
        SET status = $2::ponto.absence_justification_status,
            approved_by_user_id = $3::uuid,
            decided_at = now(),
            reason = CASE WHEN NULLIF($4, '') IS NULL THEN reason ELSE reason || E'\nDecision: ' || $4 END,
            medical_leave_id = NULLIF($5, '')::uuid
        WHERE absence_justification_id = $1::uuid
        RETURNING absence_justification_id::text, employee_id::text, kind::text, absence_start,
                  absence_end, status::text, reason, attachment_id::text, requested_by_user_id::text,
                  approved_by_user_id::text, decided_at, payroll_treatment::text, medical_leave_id::text
        `,
        [
          id,
          input.decision,
          input.approverUserId,
          input.reason?.trim() ?? '',
          medicalLeaveId ?? '',
        ],
      );
      const decided = rows.rows[0];
      if (input.decision === 'APPROVED') {
        await this.linkTimeRecords(client, decided);
      }
      return this.toModel(decided);
    });
  }

  async cancel(id: string): Promise<AbsenceJustification> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const current = await this.loadForUpdate(client, id);
      this.workflowService.assertTransition(
        current.status as AbsenceJustificationStatus,
        'CANCELLED',
      );
      const rows = await client.query<JustificationRow>(
        `
        UPDATE ponto.absence_justification
        SET status = 'CANCELLED'::ponto.absence_justification_status
        WHERE absence_justification_id = $1::uuid
        RETURNING absence_justification_id::text, employee_id::text, kind::text, absence_start,
                  absence_end, status::text, reason, attachment_id::text, requested_by_user_id::text,
                  approved_by_user_id::text, decided_at, payroll_treatment::text, medical_leave_id::text
        `,
        [id],
      );
      return this.toModel(rows.rows[0]);
    });
  }

  private async loadForUpdate(
    client: PoolClient,
    id: string,
  ): Promise<JustificationRow> {
    const rows = await client.query<JustificationRow>(
      `
      SELECT absence_justification_id::text, employee_id::text, kind::text, absence_start,
             absence_end, status::text, reason, attachment_id::text, requested_by_user_id::text,
             approved_by_user_id::text, decided_at, payroll_treatment::text, medical_leave_id::text
      FROM ponto.absence_justification
      WHERE absence_justification_id = $1::uuid
      FOR UPDATE
      `,
      [id],
    );
    if (!rows.rows[0]) {
      throw new NotFoundException('Absence justification not found');
    }
    return rows.rows[0];
  }

  private async linkTimeRecords(
    client: PoolClient,
    row: JustificationRow,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO ponto.time_record_justification_link (
        tenant_id,
        time_record_id,
        absence_justification_id
      )
      SELECT record.tenant_id, record.time_record_id, $1::uuid
      FROM ponto.time_record record
      WHERE record.tenant_id = public.sgp_current_tenant_uuid()
        AND record.employee_id = $2::uuid
        AND record.recorded_at >= $3::timestamptz
        AND record.recorded_at <= $4::timestamptz
      ON CONFLICT DO NOTHING
      `,
      [
        row.absence_justification_id,
        row.employee_id,
        row.absence_start,
        row.absence_end,
      ],
    );
  }

  private toModel(row: JustificationRow): AbsenceJustification {
    return {
      absenceJustificationId: row.absence_justification_id,
      employeeId: row.employee_id,
      kind: row.kind as AbsenceJustification['kind'],
      absenceStart: formatInstantIso(row.absence_start),
      absenceEnd: formatInstantIso(row.absence_end),
      status: row.status as AbsenceJustification['status'],
      reason: row.reason,
      attachmentId: row.attachment_id,
      requestedByUserId: row.requested_by_user_id,
      approvedByUserId: row.approved_by_user_id,
      decidedAt: row.decided_at ? formatInstantIso(row.decided_at) : null,
      payrollTreatment:
        row.payroll_treatment as AbsenceJustification['payrollTreatment'],
      medicalLeaveId: row.medical_leave_id,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
