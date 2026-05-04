import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateCareerPlanDto, UpdateCareerPlanDto } from './avaliacao.dto';
import { AvaliacaoDataAccessService } from './avaliacao-data-access.service';
import {
  CareerPlanSqlRow,
  CareerPlanSummary,
  EmployeeReferenceRow,
} from './avaliacao.types';

@Injectable()
export class CareerPlanRuntimeService {
  constructor(private readonly data: AvaliacaoDataAccessService) {}

  async list(): Promise<CareerPlanSummary[]> {
    this.data.ensureDatabase();

    const rows = await this.data.query<CareerPlanSqlRow>(
      `
      SELECT
        plan.id,
        plan.employee_id::text,
        employee.registration AS employee_registration,
        employee.name AS employee_name,
        plan.name,
        plan.version,
        plan.effective_on,
        plan.levels_json,
        plan.references_json,
        plan.active
      FROM hr.career_plan plan
      LEFT JOIN hr.employee employee ON employee.id = plan.employee_id
      ORDER BY plan.active DESC, plan.effective_on DESC, plan.name ASC
      `,
    );

    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateCareerPlanDto): Promise<CareerPlanSummary> {
    this.data.ensureDatabase();

    let employee: EmployeeReferenceRow | null = null;
    if (input.funcionarioId) {
      employee = await this.data.employeeReference(input.funcionarioId);
    }

    const rows = await this.data.query<CareerPlanSqlRow>(
      `
      INSERT INTO hr.career_plan (
        employee_id,
        name,
        version,
        effective_on,
        levels_json,
        references_json,
        active
      )
      VALUES (
        NULLIF($1, '')::uuid,
        $2,
        $3,
        $4::date,
        $5::jsonb,
        $6::jsonb,
        $7
      )
      RETURNING
        id,
        employee_id::text,
        $8::text AS employee_registration,
        $9::text AS employee_name,
        name,
        version,
        effective_on,
        levels_json,
        references_json,
        active
      `,
      [
        input.funcionarioId ?? '',
        input.nome.trim(),
        input.versao.trim(),
        input.dataVigencia,
        JSON.stringify(input.niveis ?? {}),
        JSON.stringify(input.referencias ?? {}),
        input.ativo ?? true,
        employee?.registration ?? null,
        employee?.name ?? null,
      ],
    );

    return this.toSummary(rows[0]!);
  }

  async update(
    id: string,
    input: UpdateCareerPlanDto,
  ): Promise<CareerPlanSummary> {
    this.data.ensureDatabase();

    const rows = await this.data.query<CareerPlanSqlRow>(
      `
      UPDATE hr.career_plan plan
      SET
        name = COALESCE(NULLIF($2, ''), plan.name),
        version = COALESCE(NULLIF($3, ''), plan.version),
        effective_on = COALESCE($4::date, plan.effective_on),
        levels_json = COALESCE($5::jsonb, plan.levels_json),
        references_json = COALESCE($6::jsonb, plan.references_json),
        active = COALESCE($7, plan.active),
        updated_at = now()
      FROM hr.employee employee
      WHERE plan.id = $1::uuid
        AND (employee.id = plan.employee_id OR plan.employee_id IS NULL)
      RETURNING
        plan.id,
        plan.employee_id::text,
        employee.registration AS employee_registration,
        employee.name AS employee_name,
        plan.name,
        plan.version,
        plan.effective_on,
        plan.levels_json,
        plan.references_json,
        plan.active
      `,
      [
        id,
        input.nome ?? '',
        input.versao ?? '',
        input.dataVigencia ?? null,
        input.niveis ? JSON.stringify(input.niveis) : null,
        input.referencias ? JSON.stringify(input.referencias) : null,
        input.ativo ?? null,
      ],
    );

    if (!rows[0]) {
      const fallback = await this.data.query<CareerPlanSqlRow>(
        `
        SELECT
          plan.id,
          plan.employee_id::text,
          employee.registration AS employee_registration,
          employee.name AS employee_name,
          plan.name,
          plan.version,
          plan.effective_on,
          plan.levels_json,
          plan.references_json,
          plan.active
        FROM hr.career_plan plan
        LEFT JOIN hr.employee employee ON employee.id = plan.employee_id
        WHERE plan.id = $1::uuid
        `,
        [id],
      );
      if (!fallback[0]) {
        throw new NotFoundException('Career plan not found');
      }
      return this.toSummary(fallback[0]);
    }

    return this.toSummary(rows[0]);
  }

  private toSummary(row: CareerPlanSqlRow): CareerPlanSummary {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.employee_registration,
      nomeServidor: row.employee_name,
      nome: row.name,
      versao: row.version,
      dataVigencia: this.data.toIsoDate(row.effective_on),
      niveis: this.data.asObject(row.levels_json),
      referencias: this.data.asObject(row.references_json),
      ativo: row.active,
    };
  }
}
