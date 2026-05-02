import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  EmitCatDto,
  RegisterWorkAccidentDto,
  ReportWorkAccidentDeathDto,
} from './cat.dto';
import { CatEmissionService, CatEmissionSummary } from './cat-emission.service';

interface WorkAccidentRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_name: string | null;
  accident_at: Date | string;
  accident_type: string;
  location_text: string;
  body_part_code: string;
  agent_cause_code: string;
  witness_text: string;
  severity: string;
  death_at: Date | string | null;
  status: string;
  latest_cat_kind: string | null;
  latest_deadline_at: Date | string | null;
  latest_esocial_event_id: string | null;
}

interface DeadlineRow extends QueryResultRow {
  id: string;
  work_accident_id: string;
  employee_name: string;
  cat_kind: string;
  deadline_at: Date | string;
  enqueued_at: Date | string | null;
  esocial_event_id: string | null;
}

export interface WorkAccidentSummary {
  id: string;
  employeeId: string;
  employeeName: string | null;
  accidentAt: string;
  accidentType: string;
  locationText: string;
  bodyPartCode: string;
  agentCauseCode: string;
  witnessText: string;
  severity: string;
  deathAt: string | null;
  status: string;
  latestCatKind: string | null;
  latestDeadlineAt: string | null;
  latestESocialEventId: string | null;
}

export interface CatDeadlineAlert {
  id: string;
  workAccidentId: string;
  employeeName: string;
  catKind: string;
  deadlineAt: string;
  enqueuedAt: string | null;
  esocialEventId: string | null;
}

@Injectable()
export class WorkAccidentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly catEmissionService: CatEmissionService,
  ) {}

  async list(): Promise<WorkAccidentSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<WorkAccidentRow>(
      `
      SELECT
        accident.id::text,
        accident.employee_id::text,
        employee.name AS employee_name,
        accident.accident_at,
        accident.accident_type::text,
        accident.location_text,
        accident.body_part_code,
        accident.agent_cause_code,
        accident.witness_text,
        accident.severity::text,
        accident.death_at,
        accident.status::text,
        cat.cat_kind::text AS latest_cat_kind,
        cat.deadline_at AS latest_deadline_at,
        cat.esocial_event_id::text AS latest_esocial_event_id
      FROM saude.work_accident accident
      JOIN hr.employee employee ON employee.id = accident.employee_id
      LEFT JOIN LATERAL (
        SELECT cat_kind, deadline_at, esocial_event_id
        FROM saude.cat_emission
        WHERE work_accident_id = accident.id
          AND tenant_id = accident.tenant_id
        ORDER BY emitted_at DESC
        LIMIT 1
      ) cat ON true
      ORDER BY accident.accident_at DESC
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async register(input: RegisterWorkAccidentDto): Promise<WorkAccidentSummary> {
    this.ensureDatabase();
    if (input.severity === 'FATAL' && !input.deathAt) {
      throw new BadRequestException('Fatal accident requires deathAt');
    }
    await this.ensureEmployee(input.employeeId);
    const rows = await this.databaseService.query<WorkAccidentRow>(
      `
      INSERT INTO saude.work_accident (
        employee_id,
        accident_at,
        accident_type,
        location_text,
        body_part_code,
        agent_cause_code,
        witness_text,
        severity,
        death_at
      )
      VALUES (
        $1::uuid,
        $2::timestamptz,
        $3::saude.work_accident_type,
        $4,
        $5,
        $6,
        $7,
        $8::saude.work_accident_severity,
        NULLIF($9, '')::timestamptz
      )
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        accident_at,
        accident_type::text,
        location_text,
        body_part_code,
        agent_cause_code,
        witness_text,
        severity::text,
        death_at,
        status::text,
        NULL::text AS latest_cat_kind,
        NULL::timestamptz AS latest_deadline_at,
        NULL::text AS latest_esocial_event_id
      `,
      [
        input.employeeId,
        input.accidentAt,
        input.accidentType,
        input.locationText.trim(),
        digits(input.bodyPartCode, 9),
        digits(input.agentCauseCode, 9),
        input.witnessText?.trim() ?? '',
        input.severity,
        input.deathAt ?? '',
      ],
    );
    return this.toSummary(rows[0]);
  }

  async emitCat(
    workAccidentId: string,
    input: EmitCatDto,
  ): Promise<CatEmissionSummary> {
    return this.catEmissionService.emit(workAccidentId, input);
  }

  async reopen(
    workAccidentId: string,
    input: Omit<EmitCatDto, 'catKind'>,
  ): Promise<CatEmissionSummary> {
    return this.catEmissionService.emit(workAccidentId, {
      ...input,
      catKind: 'REABERTURA',
    });
  }

  async reportDeath(
    workAccidentId: string,
    input: ReportWorkAccidentDeathDto,
  ): Promise<CatEmissionSummary> {
    this.ensureDatabase();
    await this.databaseService.query(
      `
      UPDATE saude.work_accident
      SET severity = 'FATAL'::saude.work_accident_severity,
          death_at = $2::timestamptz
      WHERE id = $1::uuid
      `,
      [workAccidentId, input.deathAt],
    );
    return this.catEmissionService.emit(workAccidentId, {
      catKind: 'OBITO',
      emittedAt: input.deathAt,
      doctorCrm: input.doctorCrm,
      doctorName: input.doctorName,
      internment: input.internment,
      leaveUntil: input.leaveUntil,
    });
  }

  async close(workAccidentId: string): Promise<WorkAccidentSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<WorkAccidentRow>(
      `
      UPDATE saude.work_accident
      SET status = 'ENCERRADO'::saude.work_accident_status
      WHERE id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        NULL::text AS employee_name,
        accident_at,
        accident_type::text,
        location_text,
        body_part_code,
        agent_cause_code,
        witness_text,
        severity::text,
        death_at,
        status::text,
        NULL::text AS latest_cat_kind,
        NULL::timestamptz AS latest_deadline_at,
        NULL::text AS latest_esocial_event_id
      `,
      [workAccidentId],
    );
    if (!rows[0]) throw new NotFoundException('Work accident not found');
    return this.toSummary(rows[0]);
  }

  async listDeadlineAlerts(
    referenceDate = new Date(),
  ): Promise<CatDeadlineAlert[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<DeadlineRow>(
      `
      SELECT
        cat.id::text,
        cat.work_accident_id::text,
        employee.name AS employee_name,
        cat.cat_kind::text,
        cat.deadline_at,
        pending.enqueued_at,
        cat.esocial_event_id::text
      FROM saude.cat_emission cat
      JOIN saude.work_accident accident ON accident.id = cat.work_accident_id
      JOIN hr.employee employee ON employee.id = accident.employee_id
      LEFT JOIN esocial.s2210_pending pending
        ON pending.tenant_id = cat.tenant_id
       AND pending.cat_emission_id = cat.id
      WHERE cat.esocial_event_id IS NULL
        AND cat.deadline_at <= ($1::timestamptz + interval '4 hours')
      ORDER BY cat.deadline_at ASC
      `,
      [referenceDate.toISOString()],
    );
    return rows.map((row) => ({
      id: row.id,
      workAccidentId: row.work_accident_id,
      employeeName: row.employee_name,
      catKind: row.cat_kind,
      deadlineAt: new Date(row.deadline_at).toISOString(),
      enqueuedAt: row.enqueued_at
        ? new Date(row.enqueued_at).toISOString()
        : null,
      esocialEventId: row.esocial_event_id,
    }));
  }

  private async ensureEmployee(employeeId: string): Promise<void> {
    const rows = await this.databaseService.query<QueryResultRow>(
      'SELECT 1 FROM hr.employee WHERE id = $1::uuid',
      [employeeId],
    );
    if (!rows[0]) throw new NotFoundException('Employee not found');
  }

  private toSummary(row: WorkAccidentRow): WorkAccidentSummary {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      accidentAt: new Date(row.accident_at).toISOString(),
      accidentType: row.accident_type,
      locationText: row.location_text,
      bodyPartCode: row.body_part_code,
      agentCauseCode: row.agent_cause_code,
      witnessText: row.witness_text,
      severity: row.severity,
      deathAt: row.death_at ? new Date(row.death_at).toISOString() : null,
      status: row.status,
      latestCatKind: row.latest_cat_kind,
      latestDeadlineAt: row.latest_deadline_at
        ? new Date(row.latest_deadline_at).toISOString()
        : null,
      latestESocialEventId: row.latest_esocial_event_id,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for work accident operations',
      );
    }
  }
}

function digits(value: string, length: number): string {
  const cleaned = value.replace(/\D/gu, '');
  return cleaned.padStart(length, '0').slice(0, length);
}
