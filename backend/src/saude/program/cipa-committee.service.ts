import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  AddCipaMemberDto,
  AddCipaMinuteDto,
  CreateCipaCommitteeDto,
} from './program.dto';

interface CipaCommitteeRow extends QueryResultRow {
  id: string;
  work_location_id: string;
  work_location_name: string | null;
  election_call_ref: string;
  mandate_start: Date | string;
  mandate_end: Date | string;
  status: string;
  metadata: Record<string, unknown>;
}

interface CipaMemberRow extends QueryResultRow {
  id: string;
  committee_id: string;
  employee_id: string;
  role: string;
  status: string;
  elected_at: Date | string | null;
  appointed_at: Date | string | null;
  removed_at: Date | string | null;
}

interface CipaMinuteRow extends QueryResultRow {
  id: string;
  committee_id: string;
  meeting_at: Date | string;
  subject: string;
  minutes_uri: string;
  sha256: string;
  metadata: Record<string, unknown>;
}

export interface CipaCommitteeSummary {
  id: string;
  workLocationId: string;
  workLocationName: string | null;
  electionCallRef: string;
  mandateStart: string;
  mandateEnd: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface CipaMemberSummary {
  id: string;
  committeeId: string;
  employeeId: string;
  role: string;
  status: string;
  electedAt: string | null;
  appointedAt: string | null;
  removedAt: string | null;
}

export interface CipaMinuteSummary {
  id: string;
  committeeId: string;
  meetingAt: string;
  subject: string;
  minutesUri: string;
  sha256: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class CipaCommitteeService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<CipaCommitteeSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CipaCommitteeRow>(
      `
      SELECT c.id::text, c.work_location_id::text, wl.name AS work_location_name,
             c.election_call_ref, c.mandate_start, c.mandate_end,
             c.status::text, c.metadata
      FROM saude.cipa_committee c
      JOIN hr.work_location wl ON wl.id = c.work_location_id
      ORDER BY c.status = 'ACTIVE' DESC, c.mandate_start DESC
      `,
    );
    return rows.map((row) => this.toCommitteeSummary(row));
  }

  async create(input: CreateCipaCommitteeDto): Promise<CipaCommitteeSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CipaCommitteeRow>(
      `
      INSERT INTO saude.cipa_committee (
        work_location_id, election_call_ref, mandate_start, mandate_end,
        metadata
      )
      VALUES ($1::uuid, $2, $3::date, $4::date, $5::jsonb)
      RETURNING id::text, work_location_id::text,
        NULL::text AS work_location_name, election_call_ref, mandate_start,
        mandate_end, status::text, metadata
      `,
      [
        input.workLocationId,
        input.electionCallRef.trim(),
        input.mandateStart,
        input.mandateEnd,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return this.toCommitteeSummary(rows[0]!);
  }

  async activate(id: string): Promise<CipaCommitteeSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const currentRows = await client.query<CipaCommitteeRow>(
        `
        SELECT id::text, work_location_id::text, NULL::text AS work_location_name,
               election_call_ref, mandate_start, mandate_end, status::text,
               metadata
        FROM saude.cipa_committee
        WHERE id = $1::uuid
        FOR UPDATE
        `,
        [id],
      );
      const current = currentRows.rows[0];
      if (!current) throw new NotFoundException('CIPA committee not found');
      if (current.status === 'ARCHIVED' || current.status === 'CLOSED') {
        throw new BadRequestException(
          'Closed CIPA committee cannot be activated',
        );
      }

      await client.query(
        `
        UPDATE saude.cipa_committee
        SET status = 'CLOSED'::saude.cipa_committee_status
        WHERE work_location_id = $1::uuid
          AND status = 'ACTIVE'::saude.cipa_committee_status
          AND id <> $2::uuid
        `,
        [current.work_location_id, id],
      );
      const updated = await client.query<CipaCommitteeRow>(
        `
        UPDATE saude.cipa_committee
        SET status = 'ACTIVE'::saude.cipa_committee_status
        WHERE id = $1::uuid
        RETURNING id::text, work_location_id::text,
          NULL::text AS work_location_name, election_call_ref, mandate_start,
          mandate_end, status::text, metadata
        `,
        [id],
      );
      return this.toCommitteeSummary(updated.rows[0]!);
    });
  }

  async addMember(
    id: string,
    input: AddCipaMemberDto,
  ): Promise<CipaMemberSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CipaMemberRow>(
      `
      INSERT INTO saude.cipa_member (
        committee_id, employee_id, role, status, elected_at, appointed_at
      )
      VALUES (
        $1::uuid, $2::uuid, $3::saude.cipa_member_role,
        $4::saude.cipa_member_status, NULLIF($5, '')::date,
        NULLIF($6, '')::date
      )
      RETURNING id::text, committee_id::text, employee_id::text, role::text,
        status::text, elected_at, appointed_at, removed_at
      `,
      [
        id,
        input.employeeId,
        input.role,
        input.status ?? 'ACTIVE',
        input.electedAt ?? '',
        input.appointedAt ?? '',
      ],
    );
    return this.toMemberSummary(rows[0]!);
  }

  async addMinute(
    id: string,
    input: AddCipaMinuteDto,
  ): Promise<CipaMinuteSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CipaMinuteRow>(
      `
      INSERT INTO saude.cipa_minute (
        committee_id, meeting_at, subject, minutes_uri, sha256, metadata
      )
      VALUES ($1::uuid, $2::timestamptz, $3, $4, $5, $6::jsonb)
      RETURNING id::text, committee_id::text, meeting_at, subject,
        minutes_uri, sha256, metadata
      `,
      [
        id,
        input.meetingAt,
        input.subject.trim(),
        input.minutesUri,
        input.sha256,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return this.toMinuteSummary(rows[0]!);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toCommitteeSummary(row: CipaCommitteeRow): CipaCommitteeSummary {
    return {
      id: row.id,
      workLocationId: row.work_location_id,
      workLocationName: row.work_location_name,
      electionCallRef: row.election_call_ref,
      mandateStart: this.dateValue(row.mandate_start),
      mandateEnd: this.dateValue(row.mandate_end),
      status: row.status,
      metadata: row.metadata,
    };
  }

  private toMemberSummary(row: CipaMemberRow): CipaMemberSummary {
    return {
      id: row.id,
      committeeId: row.committee_id,
      employeeId: row.employee_id,
      role: row.role,
      status: row.status,
      electedAt: this.nullableDateValue(row.elected_at),
      appointedAt: this.nullableDateValue(row.appointed_at),
      removedAt: this.nullableDateValue(row.removed_at),
    };
  }

  private toMinuteSummary(row: CipaMinuteRow): CipaMinuteSummary {
    return {
      id: row.id,
      committeeId: row.committee_id,
      meetingAt: this.timestampValue(row.meeting_at),
      subject: row.subject,
      minutesUri: row.minutes_uri,
      sha256: row.sha256,
      metadata: row.metadata,
    };
  }

  private nullableDateValue(value: Date | string | null): string | null {
    return value === null ? null : this.dateValue(value);
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  private timestampValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
