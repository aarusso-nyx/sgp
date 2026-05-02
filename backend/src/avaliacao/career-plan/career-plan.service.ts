import { Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuthenticatedActor } from '../../auth/auth.types';
import { DatabaseService } from '../../database/database.service';
import { CareerPlanMutationDto } from './career-plan.dto';

interface CareerPlanRow extends QueryResultRow {
  id: string;
  name: string;
  instituting_law: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  class_count: number;
  reference_count: number;
  progression_rule: string;
  job_position_ids: string[] | null;
  salary_range_ids: string[] | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CareerTrailRow extends QueryResultRow {
  career_plan_id: string;
  career_plan_name: string;
  progression_rule: string;
  job_position_id: string | null;
  job_position_code: string | null;
  job_position_name: string | null;
  level_id: string;
  class_number: number;
  level_number: number;
  base_salary: string;
  is_current: boolean;
}

@Injectable()
export class CareerPlanService {
  constructor(private readonly database: DatabaseService) {}

  async list(): Promise<unknown[]> {
    const rows = await this.database.query<CareerPlanRow>(
      `
      SELECT
        cp.id::text,
        cp.name,
        cp.instituting_law,
        cp.starts_on,
        cp.ends_on,
        cp.class_count,
        cp.reference_count,
        cp.progression_rule,
        COALESCE(array_agg(DISTINCT cpj.job_position_id::text) FILTER (WHERE cpj.job_position_id IS NOT NULL), '{}') AS job_position_ids,
        COALESCE(array_agg(DISTINCT sr.id::text) FILTER (WHERE sr.id IS NOT NULL), '{}') AS salary_range_ids,
        cp.created_at,
        cp.updated_at
      FROM avaliacao.career_plan cp
      LEFT JOIN avaliacao.career_plan_job_position cpj ON cpj.career_plan_id = cp.id
      LEFT JOIN hr.salary_range sr ON sr.career_plan_id = cp.id
      GROUP BY cp.id
      ORDER BY cp.starts_on DESC, cp.name ASC
      `,
    );
    return rows.map((row) => this.toPlanDto(row));
  }

  async create(input: CareerPlanMutationDto): Promise<unknown> {
    return this.database.transaction(async (client) => {
      const row = await this.insertOrUpdate(client, input);
      await this.appendAudit(
        client,
        'CREATE',
        row.id,
        null,
        this.toPlanDto(row),
      );
      return this.toPlanDto(row);
    });
  }

  async update(id: string, input: CareerPlanMutationDto): Promise<unknown> {
    return this.database.transaction(async (client) => {
      const before = await this.getRaw(client, id);
      const row = await this.insertOrUpdate(client, input, id);
      await this.appendAudit(
        client,
        'UPDATE',
        row.id,
        this.toPlanDto(before),
        this.toPlanDto(row),
      );
      return this.toPlanDto(row);
    });
  }

  async trail(id: string, employeeId?: string): Promise<unknown> {
    const rows = await this.database.query<CareerTrailRow>(
      `
      WITH employee_job AS (
        SELECT e.job_position_id
        FROM hr.employee e
        WHERE e.id = NULLIF($2, '')::uuid
      ), linked_jobs AS (
        SELECT cpj.job_position_id
        FROM avaliacao.career_plan_job_position cpj
        WHERE cpj.career_plan_id = $1::uuid
      ), levels AS (
        SELECT
          cp.id AS career_plan_id,
          cp.name AS career_plan_name,
          cp.progression_rule,
          jp.id AS job_position_id,
          jp.code AS job_position_code,
          jp.name AS job_position_name,
          srl.id AS level_id,
          srl.class_number,
          srl.level_number_fol02 AS level_number,
          srl.base_salary,
          CASE
            WHEN employee_job.job_position_id IS NOT NULL
              AND employee_job.job_position_id = jp.id
              AND srl.id = first_value(srl.id) OVER (
                PARTITION BY jp.id
                ORDER BY srl.class_number, srl.level_number_fol02
              )
              THEN true
            ELSE false
          END AS is_current
        FROM avaliacao.career_plan cp
        LEFT JOIN linked_jobs ON true
        LEFT JOIN hr.job_position jp ON jp.id = linked_jobs.job_position_id
        LEFT JOIN employee_job ON true
        LEFT JOIN hr.salary_range sr ON sr.career_plan_id = cp.id OR sr.id = jp.salary_range_id
        LEFT JOIN hr.salary_range_level srl ON srl.salary_range_id = sr.id
        WHERE cp.id = $1::uuid
      )
      SELECT
        career_plan_id::text,
        career_plan_name,
        progression_rule,
        job_position_id::text,
        job_position_code,
        job_position_name,
        level_id::text,
        class_number,
        level_number,
        base_salary::text,
        is_current
      FROM levels
      WHERE level_id IS NOT NULL
      ORDER BY job_position_code NULLS LAST, class_number, level_number
      `,
      [id, employeeId ?? ''],
    );

    if (rows.length === 0) {
      const exists = await this.database.query<QueryResultRow>(
        'SELECT 1 FROM avaliacao.career_plan WHERE id = $1::uuid',
        [id],
      );
      if (!exists[0]) throw new NotFoundException('Career plan not found.');
    }

    return {
      careerPlanId: id,
      name: rows[0]?.career_plan_name ?? null,
      progressionRule: rows[0]?.progression_rule ?? null,
      employeeId: employeeId ?? null,
      current: rows.find((row) => row.is_current)
        ? this.toTrailStep(rows.find((row) => row.is_current) as CareerTrailRow)
        : null,
      steps: rows.map((row) => this.toTrailStep(row)),
    };
  }

  async trailForActor(actor: AuthenticatedActor | undefined): Promise<unknown> {
    const cpfClaim = actor?.claims?.cpf;
    const cpf = typeof cpfClaim === 'string' ? cpfClaim : '';
    const rows = await this.database.query<QueryResultRow>(
      `
      SELECT cp.id::text AS id, e.id::text AS employee_id
      FROM hr.employee e
      JOIN avaliacao.career_plan_job_position cpj ON cpj.job_position_id = e.job_position_id
      JOIN avaliacao.career_plan cp ON cp.id = cpj.career_plan_id
      WHERE e.cpf = NULLIF($1, '')
         OR e.registration = NULLIF($2, '')
      ORDER BY cp.starts_on DESC
      LIMIT 1
      `,
      [cpf, actor?.username ?? ''],
    );
    if (!rows[0]) return { careerPlanId: null, current: null, steps: [] };
    return this.trail(String(rows[0].id), String(rows[0].employee_id));
  }

  private async insertOrUpdate(
    client: PoolClient,
    input: CareerPlanMutationDto,
    id?: string,
  ): Promise<CareerPlanRow> {
    const result = await client.query<CareerPlanRow>(
      id
        ? `
        UPDATE avaliacao.career_plan
        SET name = $2,
          instituting_law = $3,
          starts_on = $4::date,
          ends_on = $5::date,
          class_count = $6,
          reference_count = $7,
          progression_rule = $8,
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text, name, instituting_law, starts_on, ends_on,
          class_count, reference_count, progression_rule,
          '{}'::text[] AS job_position_ids, '{}'::text[] AS salary_range_ids,
          created_at, updated_at
        `
        : `
        INSERT INTO avaliacao.career_plan (
          tenant_id, name, instituting_law, starts_on, ends_on, class_count,
          reference_count, progression_rule
        ) VALUES (
          public.sgp_current_tenant_uuid(), $2, $3, $4::date, $5::date, $6, $7, $8
        )
        RETURNING id::text, name, instituting_law, starts_on, ends_on,
          class_count, reference_count, progression_rule,
          '{}'::text[] AS job_position_ids, '{}'::text[] AS salary_range_ids,
          created_at, updated_at
        `,
      [
        id ?? null,
        input.name,
        input.institutingLaw,
        input.startsOn,
        input.endsOn ?? null,
        input.classCount,
        input.referenceCount,
        input.progressionRule,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Career plan not found.');

    await client.query(
      'DELETE FROM avaliacao.career_plan_job_position WHERE career_plan_id = $1::uuid',
      [row.id],
    );
    for (const jobPositionId of input.jobPositionIds ?? []) {
      await client.query(
        `
        INSERT INTO avaliacao.career_plan_job_position (career_plan_id, job_position_id, tenant_id)
        VALUES ($1::uuid, $2::uuid, public.sgp_current_tenant_uuid())
        `,
        [row.id, jobPositionId],
      );
    }
    if (input.salaryRangeId) {
      await client.query(
        `
        UPDATE hr.salary_range
        SET career_plan_id = $1::uuid, updated_at = now()
        WHERE id = $2::uuid
        `,
        [row.id, input.salaryRangeId],
      );
    }
    return this.getRaw(client, row.id);
  }

  private async getRaw(client: PoolClient, id: string): Promise<CareerPlanRow> {
    const result = await client.query<CareerPlanRow>(
      `
      SELECT
        cp.id::text,
        cp.name,
        cp.instituting_law,
        cp.starts_on,
        cp.ends_on,
        cp.class_count,
        cp.reference_count,
        cp.progression_rule,
        COALESCE(array_agg(DISTINCT cpj.job_position_id::text) FILTER (WHERE cpj.job_position_id IS NOT NULL), '{}') AS job_position_ids,
        COALESCE(array_agg(DISTINCT sr.id::text) FILTER (WHERE sr.id IS NOT NULL), '{}') AS salary_range_ids,
        cp.created_at,
        cp.updated_at
      FROM avaliacao.career_plan cp
      LEFT JOIN avaliacao.career_plan_job_position cpj ON cpj.career_plan_id = cp.id
      LEFT JOIN hr.salary_range sr ON sr.career_plan_id = cp.id
      WHERE cp.id = $1::uuid
      GROUP BY cp.id
      `,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundException('Career plan not found.');
    return result.rows[0];
  }

  private async appendAudit(
    client: PoolClient,
    action: 'CREATE' | 'UPDATE',
    id: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        $1, 'avaliacao.pccs', $2, NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'avaliacao.career_plan', NULLIF(current_setting('app.request_id', true), ''),
        jsonb_build_object('event', $3, 'before', $4::jsonb, 'after', $5::jsonb),
        NULL::text, NULL::text, NULL::text
      )
      `,
      [
        action,
        id,
        action === 'CREATE'
          ? 'avaliacao.pccs.created'
          : 'avaliacao.pccs.updated',
        JSON.stringify(before),
        JSON.stringify(after),
      ],
    );
  }

  private toPlanDto(row: CareerPlanRow): Record<string, unknown> {
    return {
      id: row.id,
      name: row.name,
      institutingLaw: row.instituting_law,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      classCount: row.class_count,
      referenceCount: row.reference_count,
      progressionRule: row.progression_rule,
      jobPositionIds: row.job_position_ids ?? [],
      salaryRangeIds: row.salary_range_ids ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toTrailStep(row: CareerTrailRow): Record<string, unknown> {
    return {
      jobPositionId: row.job_position_id,
      jobPositionCode: row.job_position_code,
      jobPositionName: row.job_position_name,
      salaryLevelId: row.level_id,
      classNumber: row.class_number,
      referenceNumber: row.level_number,
      baseSalary: row.base_salary,
      current: row.is_current,
    };
  }
}
