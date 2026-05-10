import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { MeusDadosService } from '../meus-dados/meus-dados.service';

interface LeaveApprovalTransitionRow extends QueryResultRow {
  id: string;
  employee_id: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  days: number | null;
  status: string;
  requested_at: Date | string;
  approved_at: Date | string | null;
  approved_by: string | null;
}

@Injectable()
export class LicencasService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly meusDadosService: MeusDadosService,
  ) {}

  async transitionLeave(id: string, approve: boolean) {
    const rows = await this.databaseService.query<LeaveApprovalTransitionRow>(
      `
      UPDATE hr.leave_record AS leave_record
      SET
        approved_at = CASE WHEN $2 THEN COALESCE(approved_at, now()) ELSE approved_at END,
        approved_by = CASE WHEN $2 THEN NULLIF(current_setting('app.current_login', true), '') ELSE approved_by END,
        status = CASE WHEN $2 THEN 'ACTIVE'::"RecordStatus" ELSE 'INACTIVE'::"RecordStatus" END,
        updated_at = now()
      WHERE leave_record.id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        starts_on,
        ends_on,
        days,
        status::text,
        requested_at,
        approved_at,
        approved_by
      `,
      [id, approve],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Leave approval item not found');
    }
    return {
      kind: 'leave',
      id: row.id,
      employeeId: row.employee_id,
      startsOn: this.meusDadosService.toDate(row.starts_on),
      endsOn: row.ends_on ? this.meusDadosService.toDate(row.ends_on) : null,
      days: row.days,
      status: row.status,
      requestedAt: this.meusDadosService.toIso(row.requested_at),
      approvedAt: row.approved_at
        ? this.meusDadosService.toIso(row.approved_at)
        : null,
      approvedBy: row.approved_by,
    };
  }
}
