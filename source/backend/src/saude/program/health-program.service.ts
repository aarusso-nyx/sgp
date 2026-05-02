import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  AddRequiredExamDto,
  CreateHealthProgramDto,
  CreateProgramRevisionDto,
} from './program.dto';
import { ProgramRevisionService } from './program-revision.service';

interface HealthProgramRow extends QueryResultRow {
  id: string;
  work_location_id: string;
  work_location_name: string | null;
  valid_from: Date | string;
  valid_until: Date | string;
  responsible_doctor_crm: string;
  responsible_doctor_name: string;
  status: string;
}

interface RequiredExamRow extends QueryResultRow {
  id: string;
  health_program_id: string;
  medical_exam_id: string;
  medical_exam_name: string;
  applies_to_role_id: string | null;
  periodicity_months_override: number | null;
}

export interface RequiredExamSummary {
  id: string;
  healthProgramId: string;
  medicalExamId: string;
  medicalExamName: string;
  appliesToRoleId: string | null;
  periodicityMonthsOverride: number | null;
}

export interface HealthProgramSummary {
  id: string;
  workLocationId: string;
  workLocationName: string | null;
  validFrom: string;
  validUntil: string;
  responsibleDoctorCrm: string;
  responsibleDoctorName: string;
  status: string;
}

@Injectable()
export class HealthProgramService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly revisionService: ProgramRevisionService,
  ) {}

  async list(): Promise<HealthProgramSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<HealthProgramRow>(
      `
      SELECT hp.id::text, hp.work_location_id::text, wl.name AS work_location_name,
             hp.valid_from, hp.valid_until, hp.responsible_doctor_crm,
             hp.responsible_doctor_name, hp.status::text
      FROM saude.health_program hp
      JOIN hr.work_location wl ON wl.id = hp.work_location_id
      ORDER BY hp.status = 'ACTIVE' DESC, hp.valid_from DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateHealthProgramDto): Promise<HealthProgramSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<HealthProgramRow>(
      `
      INSERT INTO saude.health_program (
        work_location_id, valid_from, valid_until,
        responsible_doctor_crm, responsible_doctor_name
      )
      VALUES ($1::uuid, $2::date, $3::date, $4, $5)
      RETURNING id::text, work_location_id::text, NULL::text AS work_location_name,
        valid_from, valid_until, responsible_doctor_crm,
        responsible_doctor_name, status::text
      `,
      [
        input.workLocationId,
        input.validFrom,
        input.validUntil,
        input.responsibleDoctorCrm.trim(),
        input.responsibleDoctorName.trim(),
      ],
    );
    return this.toSummary(rows[0]);
  }

  async activate(id: string): Promise<HealthProgramSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const currentRows = await client.query<HealthProgramRow>(
        `
        SELECT id::text, work_location_id::text, NULL::text AS work_location_name,
          valid_from, valid_until, responsible_doctor_crm,
          responsible_doctor_name, status::text
        FROM saude.health_program
        WHERE id = $1::uuid
        FOR UPDATE
        `,
        [id],
      );
      const current = currentRows.rows[0];
      if (!current) throw new NotFoundException('PCMSO not found');
      if (current.status === 'ARCHIVED') {
        throw new BadRequestException('Archived PCMSO cannot be activated');
      }

      const previousRows = await client.query<HealthProgramRow>(
        `
        UPDATE saude.health_program
        SET status = 'SUPERSEDED'::saude.program_status
        WHERE work_location_id = $1::uuid
          AND kind = 'PCMSO'::saude.health_program_kind
          AND status = 'ACTIVE'::saude.program_status
          AND id <> $2::uuid
        RETURNING id::text, work_location_id::text, NULL::text AS work_location_name,
          valid_from, valid_until, responsible_doctor_crm,
          responsible_doctor_name, status::text
        `,
        [current.work_location_id, id],
      );
      const updated = await client.query<HealthProgramRow>(
        `
        UPDATE saude.health_program
        SET status = 'ACTIVE'::saude.program_status
        WHERE id = $1::uuid
        RETURNING id::text, work_location_id::text, NULL::text AS work_location_name,
          valid_from, valid_until, responsible_doctor_crm,
          responsible_doctor_name, status::text
        `,
        [id],
      );
      const active = updated.rows[0];
      await this.revisionService.createWithClient(client, {
        parentProgramId: id,
        parentProgramKind: 'PCMSO',
        revisionReason: 'ACTIVATION',
        snapshotJson: {
          program: this.toSummary(active),
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
          AND parent_program_kind = 'PCMSO'::saude.program_parent_kind
        ORDER BY revision_number DESC
        LIMIT 1
        `,
        [id],
      );
      return this.revisionService.createWithClient(client, {
        parentProgramId: id,
        parentProgramKind: 'PCMSO',
        revisionReason: input.revisionReason,
        signedPdfUri: input.signedPdfUri,
        sha256: input.sha256,
        snapshotJson: {
          program: this.toSummary(current),
          previousRevision: previous.rows[0] ?? null,
        },
      });
    });
  }

  async addRequiredExam(
    id: string,
    input: AddRequiredExamDto,
  ): Promise<RequiredExamSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RequiredExamRow>(
      `
      INSERT INTO saude.pcmso_required_exam (
        health_program_id, medical_exam_id, applies_to_role_id,
        periodicity_months_override
      )
      VALUES ($1::uuid, $2::uuid, NULLIF($3, '')::uuid, $4)
      RETURNING id::text, health_program_id::text, medical_exam_id::text,
        (SELECT name FROM saude.medical_exam WHERE id = $2::uuid) AS medical_exam_name,
        applies_to_role_id::text, periodicity_months_override
      `,
      [
        id,
        input.medicalExamId,
        input.appliesToRoleId ?? '',
        input.periodicityMonthsOverride ?? null,
      ],
    );
    const row = rows[0];
    return {
      id: row.id,
      healthProgramId: row.health_program_id,
      medicalExamId: row.medical_exam_id,
      medicalExamName: row.medical_exam_name,
      appliesToRoleId: row.applies_to_role_id,
      periodicityMonthsOverride: row.periodicity_months_override,
    };
  }

  private async loadWithClient(
    client: PoolClient,
    id: string,
  ): Promise<HealthProgramRow> {
    const rows = await client.query<HealthProgramRow>(
      `
      SELECT hp.id::text, hp.work_location_id::text, wl.name AS work_location_name,
             hp.valid_from, hp.valid_until, hp.responsible_doctor_crm,
             hp.responsible_doctor_name, hp.status::text
      FROM saude.health_program hp
      JOIN hr.work_location wl ON wl.id = hp.work_location_id
      WHERE hp.id = $1::uuid
      `,
      [id],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('PCMSO not found');
    return row;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: HealthProgramRow): HealthProgramSummary {
    return {
      id: row.id,
      workLocationId: row.work_location_id,
      workLocationName: row.work_location_name,
      validFrom: this.dateValue(row.valid_from),
      validUntil: this.dateValue(row.valid_until),
      responsibleDoctorCrm: row.responsible_doctor_crm,
      responsibleDoctorName: row.responsible_doctor_name,
      status: row.status,
    };
  }

  private dateValue(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
