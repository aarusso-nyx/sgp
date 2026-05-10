import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

interface CareerHistoryRow extends QueryResultRow {
  event_id: string;
  event_type: string;
  event_date: Date | string;
  ends_on: Date | string | null;
  title: string;
  notes: string;
  metadata: Record<string, unknown>;
}

export interface CareerHistoryEvent {
  id: string;
  type: string;
  date: string;
  endsOn: string | null;
  title: string;
  notes: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class HistoryService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listEmployeeHistory(
    employeeId: string,
    filters: {
      startDate?: string | undefined;
      endDate?: string | undefined;
      type?: string | undefined;
    },
  ): Promise<CareerHistoryEvent[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CareerHistoryRow>(
      `
      SELECT event_id, event_type, event_date, ends_on, title, notes, metadata
      FROM hr.v_employee_career_history
      WHERE employee_id = $1::uuid
        AND ($2::date IS NULL OR event_date >= $2::date)
        AND ($3::date IS NULL OR event_date <= $3::date)
        AND ($4::text IS NULL OR event_type = $4::text)
      ORDER BY event_date DESC, event_id DESC
      `,
      [
        employeeId,
        filters.startDate ?? null,
        filters.endDate ?? null,
        filters.type ?? null,
      ],
    );
    return rows.map((row) => ({
      id: row.event_id,
      type: row.event_type,
      date: this.toDate(row.event_date),
      endsOn: row.ends_on ? this.toDate(row.ends_on) : null,
      title: row.title,
      notes: row.notes,
      metadata: row.metadata ?? {},
    }));
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }

  private toDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
