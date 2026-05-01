import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CreateServiceTimeRecordDto } from './employees.dto';

interface ServiceTimeRow extends QueryResultRow {
  id: string;
  employee_id: string;
  source: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  days_count: number | null;
  notes: string;
}

export interface ServiceTimeRecord {
  id: string;
  employeeId: string;
  source: string;
  startsOn: string;
  endsOn: string | null;
  daysCount: number | null;
  notes: string;
}

@Injectable()
export class ServiceTimeService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(employeeId: string): Promise<ServiceTimeRecord[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ServiceTimeRow>(
      `
      SELECT id, employee_id, source, starts_on, ends_on, days_count, notes
      FROM hr.service_time_record
      WHERE employee_id = $1::uuid
      ORDER BY starts_on DESC, id DESC
      `,
      [employeeId],
    );
    return rows.map((row) => this.toRecord(row));
  }

  async create(
    employeeId: string,
    body: CreateServiceTimeRecordDto,
  ): Promise<ServiceTimeRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ServiceTimeRow>(
      `
      INSERT INTO hr.service_time_record (
        tenant_id, employee_id, source, starts_on, ends_on, days_count, notes
      )
      SELECT employee.tenant_id, employee.id, $2, $3::date, $4::date, $5::int, COALESCE($6, '')
      FROM hr.employee employee
      WHERE employee.id = $1::uuid
      RETURNING id, employee_id, source, starts_on, ends_on, days_count, notes
      `,
      [
        employeeId,
        body.source.trim(),
        body.startsOn,
        body.endsOn ?? null,
        body.daysCount ?? null,
        body.notes ?? '',
      ],
    );
    if (!rows[0]) throw new NotFoundException('Employee not found');
    return this.toRecord(rows[0]);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }

  private toRecord(row: ServiceTimeRow): ServiceTimeRecord {
    return {
      id: row.id,
      employeeId: row.employee_id,
      source: row.source,
      startsOn: this.toDate(row.starts_on),
      endsOn: row.ends_on ? this.toDate(row.ends_on) : null,
      daysCount: row.days_count,
      notes: row.notes,
    };
  }

  private toDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
