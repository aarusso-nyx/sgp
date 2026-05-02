import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { AbsenceJustificationStatus } from './justification.types';

interface EmployeeUserRow extends QueryResultRow {
  employee_id: string;
}

interface LeaveRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class JustificationWorkflowService {
  constructor(private readonly databaseService: DatabaseService) {}

  assertTransition(
    current: AbsenceJustificationStatus,
    next: AbsenceJustificationStatus,
  ): void {
    const allowed: Record<
      AbsenceJustificationStatus,
      AbsenceJustificationStatus[]
    > = {
      REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: [],
      REJECTED: [],
      CANCELLED: [],
    };
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Invalid justification transition ${current} -> ${next}`,
      );
    }
  }

  async assertApproverAboveEmployee(
    client: PoolClient,
    employeeId: string,
    approverUserId: string,
  ): Promise<void> {
    const result = await client.query<EmployeeUserRow>(
      `
      SELECT employee.id::text AS employee_id
      FROM public.user_account account
      JOIN hr.employee employee
        ON employee.cpf IS NOT DISTINCT FROM account.cpf
       AND employee.tenant_id = public.sgp_current_tenant_uuid()
      WHERE account.id = $1::uuid
      LIMIT 1
      `,
      [approverUserId],
    );
    const approverEmployeeId = result.rows[0]?.employee_id;
    if (!approverEmployeeId) {
      throw new ForbiddenException('Approver is not linked to an HR employee');
    }
    if (approverEmployeeId === employeeId) {
      throw new ForbiddenException(
        'Approver must be above the requesting employee',
      );
    }
  }

  medicalLeaveDays(absenceStart: string, absenceEnd: string): number {
    const start = new Date(absenceStart);
    const end = new Date(absenceEnd);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      throw new BadRequestException('Invalid absence period');
    }
    const diffMs = end.getTime() - start.getTime();
    return Math.max(1, Math.floor(diffMs / 86_400_000) + 1);
  }

  async createMedicalLeaveHandoff(
    client: PoolClient,
    input: {
      employeeId: string;
      absenceStart: string;
      absenceEnd: string;
      attachmentId: string | null;
      justificationId: string;
    },
  ): Promise<string> {
    const days = this.medicalLeaveDays(input.absenceStart, input.absenceEnd);
    if (days <= 15) return '';

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
        status,
        notes,
        supporting_document_ref,
        requested_at,
        approved_at
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        NULL,
        $2::timestamptz::date,
        $3::timestamptz::date,
        $4,
        true,
        'ACTIVE'::"RecordStatus",
        $5,
        $6,
        now(),
        now()
      )
      RETURNING id::text
      `,
      [
        input.employeeId,
        input.absenceStart,
        input.absenceEnd,
        days,
        `Medical leave handoff from ponto.absence_justification ${input.justificationId}`,
        input.attachmentId,
      ],
    );

    const leaveId = result.rows[0]?.id;
    if (!leaveId) {
      throw new NotFoundException('Medical leave handoff was not created');
    }
    return leaveId;
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    return this.databaseService.transaction(callback);
  }
}
