import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  formatDateOnlyUtc,
  formatInstantIso,
} from '../payroll-bridge/tenant-timezone.util';
import { GenerateDutyRosterDto } from '../ponto.dto';
import {
  RosterProjectionEntry,
  RosterProjectorService,
} from './roster-projector.service';

interface DutyRosterRow extends QueryResultRow {
  duty_roster_id: string;
  period_start: Date | string;
  period_end: Date | string;
  status: string;
  published_at: Date | string | null;
}

export interface DutyRosterSummary {
  dutyRosterId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  publishedAt: string | null;
}

@Injectable()
export class DutyRosterService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rosterProjectorService: RosterProjectorService,
  ) {}

  async list(): Promise<DutyRosterSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DutyRosterRow>(
      `
      SELECT duty_roster_id::text, period_start, period_end, status::text, published_at
      FROM ponto.duty_roster
      ORDER BY period_start DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async generate(input: GenerateDutyRosterDto): Promise<DutyRosterSummary> {
    this.ensureDatabase();
    const projections: RosterProjectionEntry[] = [];
    for (const employeeId of input.employeeIds) {
      projections.push(
        ...(await this.rosterProjectorService.projectEmployee(
          employeeId,
          input.periodStart,
          input.periodEnd,
        )),
      );
    }

    return this.databaseService.transaction(async (client) => {
      const roster = await client.query<DutyRosterRow>(
        `
        INSERT INTO ponto.duty_roster (period_start, period_end)
        VALUES ($1::date, $2::date)
        RETURNING duty_roster_id::text, period_start, period_end, status::text, published_at
        `,
        [input.periodStart, input.periodEnd],
      );
      for (const entry of projections) {
        await client.query(
          `
          INSERT INTO ponto.duty_roster_entry (
            duty_roster_id, employee_id, work_date, expected_entry, expected_exit,
            expected_minutes, night_shift_flag, hazard_flag
          )
          VALUES ($1::uuid, $2::uuid, $3::date, $4::timestamptz, $5::timestamptz, $6, $7, $8)
          `,
          [
            roster.rows[0]!.duty_roster_id,
            entry.employeeId,
            entry.workDate,
            entry.expectedEntry,
            entry.expectedExit,
            entry.expectedMinutes,
            entry.nightShiftFlag,
            entry.hazardFlag,
          ],
        );
      }
      return this.toSummary(roster.rows[0]!);
    });
  }

  async publish(dutyRosterId: string): Promise<DutyRosterSummary> {
    return this.changeStatus(dutyRosterId, 'PUBLISHED');
  }

  async lock(dutyRosterId: string): Promise<DutyRosterSummary> {
    return this.changeStatus(dutyRosterId, 'LOCKED');
  }

  async upcomingForEmployee(
    employeeId?: string,
  ): Promise<RosterProjectionEntry[]> {
    const employeeClaim = RequestContextStore.get()?.actor?.claims?.employee_id;
    const resolvedEmployeeId =
      employeeId ||
      (typeof employeeClaim === 'string' ? employeeClaim.trim() : '');
    if (!resolvedEmployeeId) return [];
    const start = new Date();
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 27);
    return this.rosterProjectorService.projectEmployee(
      resolvedEmployeeId,
      formatDateOnlyUtc(start),
      formatDateOnlyUtc(end),
    );
  }

  private async changeStatus(
    dutyRosterId: string,
    status: 'PUBLISHED' | 'LOCKED',
  ): Promise<DutyRosterSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DutyRosterRow>(
      `
      UPDATE ponto.duty_roster
      SET status = $2::ponto.duty_roster_status,
          published_at = CASE WHEN $2 = 'PUBLISHED' THEN COALESCE(published_at, now()) ELSE published_at END
      WHERE duty_roster_id = $1::uuid
      RETURNING duty_roster_id::text, period_start, period_end, status::text, published_at
      `,
      [dutyRosterId, status],
    );
    return this.toSummary(rows[0]!);
  }

  private toSummary(row: DutyRosterRow): DutyRosterSummary {
    return {
      dutyRosterId: row.duty_roster_id,
      periodStart: this.dateOnly(row.period_start),
      periodEnd: this.dateOnly(row.period_end),
      status: row.status,
      publishedAt: row.published_at ? formatInstantIso(row.published_at) : null,
    };
  }

  private dateOnly(value: Date | string): string {
    return formatDateOnlyUtc(value);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
