import { Injectable, NotFoundException } from '@nestjs/common';

import {
  CreatePerformanceEvaluationDto,
  UpdatePerformanceEvaluationDto,
} from './avaliacao.dto';
import { AvaliacaoDataAccessService } from './avaliacao-data-access.service';
import {
  PerformanceEvaluationSqlRow,
  PerformanceEvaluationSummary,
} from './avaliacao.types';

@Injectable()
export class PerformanceEvaluationService {
  constructor(private readonly data: AvaliacaoDataAccessService) {}

  async list(): Promise<PerformanceEvaluationSummary[]> {
    this.data.ensureDatabase();

    const rows = await this.data.query<PerformanceEvaluationSqlRow>(
      `
      SELECT
        evaluation.id,
        evaluation.employee_id::text,
        employee.registration AS employee_registration,
        employee.name AS employee_name,
        evaluation.branch_id::text,
        evaluation.work_location_id::text,
        evaluation.job_position_id::text,
        evaluation.job_function_id::text,
        evaluation.period_label,
        evaluation.score::text AS score,
        evaluation.criteria,
        evaluation.evaluator_ref,
        evaluation.evaluated_on,
        evaluation.status::text AS status,
        evaluation.notes
      FROM hr.performance_evaluation evaluation
      JOIN hr.employee employee ON employee.id = evaluation.employee_id
      ORDER BY evaluation.evaluated_on DESC, evaluation.created_at DESC
      `,
    );

    return rows.map((row) => this.toSummary(row));
  }

  async create(
    input: CreatePerformanceEvaluationDto,
  ): Promise<PerformanceEvaluationSummary> {
    this.data.ensureDatabase();

    const employee = await this.data.employeeReference(input.funcionarioId);

    const rows = await this.data.query<PerformanceEvaluationSqlRow>(
      `
      INSERT INTO hr.performance_evaluation (
        employee_id,
        branch_id,
        work_location_id,
        job_position_id,
        job_function_id,
        period_label,
        score,
        criteria,
        evaluator_ref,
        evaluated_on,
        status,
        notes
      )
      VALUES (
        $1::uuid,
        NULLIF($2, '')::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        NULLIF($5, '')::uuid,
        $6,
        $7::decimal,
        $8::jsonb,
        $9,
        $10::date,
        $11::"PerformanceEvaluationStatus",
        $12
      )
      RETURNING
        id,
        employee_id::text,
        $13::text AS employee_registration,
        $14::text AS employee_name,
        branch_id::text,
        work_location_id::text,
        job_position_id::text,
        job_function_id::text,
        period_label,
        score::text AS score,
        criteria,
        evaluator_ref,
        evaluated_on,
        status::text AS status,
        notes
      `,
      [
        input.funcionarioId,
        employee.branch_id ?? '',
        employee.work_location_id ?? '',
        employee.job_position_id ?? '',
        employee.job_function_id ?? '',
        input.periodo.trim(),
        input.nota.toFixed(2),
        JSON.stringify(input.criterios),
        input.avaliadorId.trim(),
        input.dataAvaliacao,
        this.data.toEvaluationStatusDb(input.status ?? 'RASCUNHO'),
        input.observacao?.trim() ?? '',
        employee.registration,
        employee.name,
      ],
    );

    return this.toSummary(rows[0]!);
  }

  async update(
    id: string,
    input: UpdatePerformanceEvaluationDto,
  ): Promise<PerformanceEvaluationSummary> {
    this.data.ensureDatabase();

    const rows = await this.data.query<PerformanceEvaluationSqlRow>(
      `
      UPDATE hr.performance_evaluation evaluation
      SET
        score = COALESCE($2::decimal, evaluation.score),
        criteria = COALESCE($3::jsonb, evaluation.criteria),
        status = COALESCE($4::"PerformanceEvaluationStatus", evaluation.status),
        evaluated_on = COALESCE($5::date, evaluation.evaluated_on),
        notes = COALESCE($6, evaluation.notes),
        updated_at = now()
      FROM hr.employee employee
      WHERE evaluation.id = $1::uuid
        AND employee.id = evaluation.employee_id
      RETURNING
        evaluation.id,
        evaluation.employee_id::text,
        employee.registration AS employee_registration,
        employee.name AS employee_name,
        evaluation.branch_id::text,
        evaluation.work_location_id::text,
        evaluation.job_position_id::text,
        evaluation.job_function_id::text,
        evaluation.period_label,
        evaluation.score::text AS score,
        evaluation.criteria,
        evaluation.evaluator_ref,
        evaluation.evaluated_on,
        evaluation.status::text AS status,
        evaluation.notes
      `,
      [
        id,
        input.nota == null ? null : input.nota.toFixed(2),
        input.criterios ? JSON.stringify(input.criterios) : null,
        input.status ? this.data.toEvaluationStatusDb(input.status) : null,
        input.dataAvaliacao ?? null,
        input.observacao ?? null,
      ],
    );

    if (!rows[0]) {
      throw new NotFoundException('Performance evaluation not found');
    }

    return this.toSummary(rows[0]);
  }

  private toSummary(
    row: PerformanceEvaluationSqlRow,
  ): PerformanceEvaluationSummary {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.employee_registration,
      nome: row.employee_name,
      filialId: row.branch_id,
      lotacaoId: row.work_location_id,
      cargoId: row.job_position_id,
      funcaoId: row.job_function_id,
      periodo: row.period_label,
      nota: Number(row.score),
      criterios: this.data.asArray(row.criteria),
      avaliadorId: row.evaluator_ref,
      dataAvaliacao: this.data.toIsoDate(row.evaluated_on),
      status: this.data.toEvaluationStatusInput(row.status),
      observacao: row.notes,
    };
  }
}
