import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { AssignWorkScheduleDto } from '../ponto.dto';

interface AssignmentRow extends QueryResultRow {
  assignment_id: string;
  employee_id: string;
  work_schedule_id: string;
  valid_from: Date | string;
  valid_to: Date | string | null;
}

export interface AssignmentSummary {
  assignmentId: string;
  employeeId: string;
  workScheduleId: string;
  validFrom: string;
  validTo: string | null;
}

@Injectable()
export class AssignmentService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assign(input: AssignWorkScheduleDto): Promise<AssignmentSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AssignmentRow>(
      `
      INSERT INTO ponto.employee_schedule_assignment (
        employee_id, work_schedule_id, valid_from, valid_to
      )
      VALUES ($1::uuid, $2::uuid, $3::date, $4::date)
      RETURNING assignment_id::text, employee_id::text, work_schedule_id::text, valid_from, valid_to
      `,
      [
        input.employeeId,
        input.workScheduleId,
        input.validFrom,
        input.validTo ?? null,
      ],
    );
    return this.toSummary(rows[0]);
  }

  async list(employeeId?: string): Promise<AssignmentSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AssignmentRow>(
      `
      SELECT assignment_id::text, employee_id::text, work_schedule_id::text, valid_from, valid_to
      FROM ponto.employee_schedule_assignment
      WHERE ($1::uuid IS NULL OR employee_id = $1::uuid)
      ORDER BY valid_from DESC
      `,
      [employeeId ?? null],
    );
    return rows.map((row) => this.toSummary(row));
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: AssignmentRow): AssignmentSummary {
    return {
      assignmentId: row.assignment_id,
      employeeId: row.employee_id,
      workScheduleId: row.work_schedule_id,
      validFrom: new Date(row.valid_from).toISOString().slice(0, 10),
      validTo: row.valid_to
        ? new Date(row.valid_to).toISOString().slice(0, 10)
        : null,
    };
  }
}
