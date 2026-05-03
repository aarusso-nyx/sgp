import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  CreateProgramRevisionDto,
  CreateRiskManagementProgramDto,
} from './program.dto';
import { ProgramRevisionService } from './program-revision.service';

interface RiskManagementProgramRow extends QueryResultRow {
  id: string;
  work_location_id: string;
  work_location_name: string | null;
  valid_from: Date | string;
  valid_until: Date | string;
  responsible_engineer_id: string | null;
  status: string;
}

@Injectable()
export class RiskManagementProgramService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly revisionService: ProgramRevisionService,
  ) {}

  async list() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RiskManagementProgramRow>(
      `
      SELECT pgr.id::text, pgr.work_location_id::text, wl.name AS work_location_name,
             pgr.valid_from, pgr.valid_until,
             pgr.responsible_engineer_id::text, pgr.status::text
      FROM saude.risk_management_program pgr
      JOIN hr.work_location wl ON wl.id = pgr.work_location_id
      ORDER BY pgr.status = 'ACTIVE' DESC, pgr.valid_from DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateRiskManagementProgramDto) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RiskManagementProgramRow>(
      `
      INSERT INTO saude.risk_management_program (
        work_location_id, valid_from, valid_until, responsible_engineer_id
      )
      VALUES ($1::uuid, $2::date, $3::date, NULLIF($4, '')::uuid)
      RETURNING id::text, work_location_id::text, NULL::text AS work_location_name,
        valid_from, valid_until, responsible_engineer_id::text, status::text
      `,
      [
        input.workLocationId,
        input.validFrom,
        input.validUntil,
        input.responsibleEngineerId ?? '',
      ],
    );
    return this.toSummary(rows[0]!);
  }

  async activate(id: string) {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const currentRows = await client.query<RiskManagementProgramRow>(
        `
        SELECT id::text, work_location_id::text, NULL::text AS work_location_name,
          valid_from, valid_until, responsible_engineer_id::text, status::text
        FROM saude.risk_management_program
        WHERE id = $1::uuid
        FOR UPDATE
        `,
        [id],
      );
      const current = currentRows.rows[0];
      if (!current) throw new NotFoundException('PGR not found');
      if (current.status === 'ARCHIVED') {
        throw new BadRequestException('Archived PGR cannot be activated');
      }
      const previousRows = await client.query<RiskManagementProgramRow>(
        `
        UPDATE saude.risk_management_program
        SET status = 'SUPERSEDED'::saude.program_status
        WHERE work_location_id = $1::uuid
          AND kind = 'PGR'::saude.risk_management_program_kind
          AND status = 'ACTIVE'::saude.program_status
          AND id <> $2::uuid
        RETURNING id::text, work_location_id::text, NULL::text AS work_location_name,
          valid_from, valid_until, responsible_engineer_id::text, status::text
        `,
        [current.work_location_id, id],
      );
      const updated = await client.query<RiskManagementProgramRow>(
        `
        UPDATE saude.risk_management_program
        SET status = 'ACTIVE'::saude.program_status
        WHERE id = $1::uuid
        RETURNING id::text, work_location_id::text, NULL::text AS work_location_name,
          valid_from, valid_until, responsible_engineer_id::text, status::text
        `,
        [id],
      );
      const active = updated.rows[0]!;
      await this.revisionService.createWithClient(client, {
        parentProgramId: id,
        parentProgramKind: 'PGR',
        revisionReason: 'ACTIVATION',
        snapshotJson: {
          program: this.toSummary(active),
          risks: [],
          supersededProgramIds: previousRows.rows.map((row) => row.id),
        },
      });
      return this.toSummary(active);
    });
  }

  async revise(id: string, input: CreateProgramRevisionDto) {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const current = await this.loadWithClient(client, id);
      const previous = await client.query(
        `
        SELECT revision_number, snapshot_json
        FROM saude.program_revision
        WHERE parent_program_id = $1::uuid
          AND parent_program_kind = 'PGR'::saude.program_parent_kind
        ORDER BY revision_number DESC
        LIMIT 1
        `,
        [id],
      );
      return this.revisionService.createWithClient(client, {
        parentProgramId: id,
        parentProgramKind: 'PGR',
        revisionReason: input.revisionReason,
        signedPdfUri: input.signedPdfUri,
        sha256: input.sha256,
        snapshotJson: {
          program: this.toSummary(current),
          risks: [],
          previousRevision: previous.rows[0] ?? null,
        },
      });
    });
  }

  private async loadWithClient(
    client: PoolClient,
    id: string,
  ): Promise<RiskManagementProgramRow> {
    const rows = await client.query<RiskManagementProgramRow>(
      `
      SELECT pgr.id::text, pgr.work_location_id::text, wl.name AS work_location_name,
             pgr.valid_from, pgr.valid_until,
             pgr.responsible_engineer_id::text, pgr.status::text
      FROM saude.risk_management_program pgr
      JOIN hr.work_location wl ON wl.id = pgr.work_location_id
      WHERE pgr.id = $1::uuid
      `,
      [id],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('PGR not found');
    return row;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: RiskManagementProgramRow) {
    return {
      id: row.id,
      workLocationId: row.work_location_id,
      workLocationName: row.work_location_name,
      validFrom: this.dateValue(row.valid_from),
      validUntil: this.dateValue(row.valid_until),
      responsibleEngineerId: row.responsible_engineer_id,
      riskSnapshot: [],
      status: row.status,
    };
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
