import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  CreateCareerPlanDto,
  CreateMeritProgressionDto,
  CreatePerformanceEvaluationDto,
  CreateSalarySimulationDto,
  GenerateAvaliacaoReportDto,
  PerformanceEvaluationStatusInput,
  ProgressionKindInput,
  UpdateCareerPlanDto,
  UpdatePerformanceEvaluationDto,
} from './avaliacao.dto';

interface EmployeeReferenceRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  branch_id: string | null;
  work_location_id: string | null;
  job_position_id: string | null;
  job_function_id: string | null;
  salary_reference_id: string | null;
}

interface SalaryReferenceAmountRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  amount: string;
}

interface PerformanceEvaluationSqlRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  branch_id: string | null;
  work_location_id: string | null;
  job_position_id: string | null;
  job_function_id: string | null;
  period_label: string;
  score: string;
  criteria: unknown;
  evaluator_ref: string;
  evaluated_on: Date | string;
  status: string;
  notes: string;
}

interface MeritProgressionSqlRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  performance_evaluation_id: string | null;
  source_salary_reference_id: string | null;
  source_salary_reference_code: string | null;
  target_salary_reference_id: string | null;
  target_salary_reference_code: string | null;
  effective_on: Date | string;
  appointment_act: string;
  kind: string;
  justification: string;
  approved_by_ref: string | null;
}

interface SalarySimulationSqlRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  scenario: string;
  result_json: unknown;
  created_by_ref: string | null;
  created_at: Date | string;
  adjustments: unknown;
}

interface CareerPlanSqlRow extends QueryResultRow {
  id: string;
  employee_id: string | null;
  employee_registration: string | null;
  employee_name: string | null;
  name: string;
  version: string;
  effective_on: Date | string;
  levels_json: unknown;
  references_json: unknown;
  active: boolean;
}

interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

export interface PerformanceEvaluationSummary {
  id: string;
  funcionarioId: string;
  matricula: string;
  nome: string;
  filialId: string | null;
  lotacaoId: string | null;
  cargoId: string | null;
  funcaoId: string | null;
  periodo: string;
  nota: number;
  criterios: unknown[];
  avaliadorId: string;
  dataAvaliacao: string;
  status: PerformanceEvaluationStatusInput;
  observacao: string;
}

export interface MeritProgressionSummary {
  id: string;
  funcionarioId: string;
  matricula: string;
  nome: string;
  avaliacaoId: string | null;
  referenciaOrigemId: string | null;
  referenciaOrigemCodigo: string | null;
  referenciaDestinoId: string | null;
  referenciaDestinoCodigo: string | null;
  dataVigencia: string;
  atoNomeacao: string;
  tipo: ProgressionKindInput;
  justificativa: string;
  aprovadoPor: string | null;
}

export interface SalarySimulationSummary {
  id: string;
  funcionarioId: string;
  matricula: string;
  nome: string;
  cenario: string;
  resultado: Record<string, unknown>;
  criadoPor: string | null;
  criadoEm: string;
  ajustes: Array<Record<string, unknown>>;
}

export interface CareerPlanSummary {
  id: string;
  funcionarioId: string | null;
  matricula: string | null;
  nomeServidor: string | null;
  nome: string;
  versao: string;
  dataVigencia: string;
  niveis: Record<string, unknown>;
  referencias: Record<string, unknown>;
  ativo: boolean;
}

@Injectable()
export class AvaliacaoService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listPerformanceEvaluations(): Promise<PerformanceEvaluationSummary[]> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<PerformanceEvaluationSqlRow>(
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

    return rows.map((row) => this.toPerformanceEvaluationSummary(row));
  }

  async createPerformanceEvaluation(
    input: CreatePerformanceEvaluationDto,
  ): Promise<PerformanceEvaluationSummary> {
    this.ensureDatabase();

    const employee = await this.employeeReference(input.funcionarioId);

    const rows = await this.databaseService.query<PerformanceEvaluationSqlRow>(
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
        this.toEvaluationStatusDb(input.status ?? 'RASCUNHO'),
        employee.registration,
        employee.name,
        input.observacao?.trim() ?? '',
      ],
    );

    return this.toPerformanceEvaluationSummary(rows[0]);
  }

  async updatePerformanceEvaluation(
    id: string,
    input: UpdatePerformanceEvaluationDto,
  ): Promise<PerformanceEvaluationSummary> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<PerformanceEvaluationSqlRow>(
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
        input.status ? this.toEvaluationStatusDb(input.status) : null,
        input.dataAvaliacao ?? null,
        input.observacao ?? null,
      ],
    );

    if (!rows[0]) {
      throw new NotFoundException('Performance evaluation not found');
    }

    return this.toPerformanceEvaluationSummary(rows[0]);
  }

  async listProgressions(): Promise<MeritProgressionSummary[]> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<MeritProgressionSqlRow>(
      `
      SELECT
        progression.id,
        progression.employee_id::text,
        employee.registration AS employee_registration,
        employee.name AS employee_name,
        progression.performance_evaluation_id::text,
        progression.source_salary_reference_id::text,
        source_reference.code AS source_salary_reference_code,
        progression.target_salary_reference_id::text,
        target_reference.code AS target_salary_reference_code,
        progression.effective_on,
        progression.appointment_act,
        progression.kind::text AS kind,
        progression.justification,
        progression.approved_by_ref
      FROM hr.merit_progression progression
      JOIN hr.employee employee ON employee.id = progression.employee_id
      LEFT JOIN hr.salary_reference source_reference
        ON source_reference.id = progression.source_salary_reference_id
      LEFT JOIN hr.salary_reference target_reference
        ON target_reference.id = progression.target_salary_reference_id
      ORDER BY progression.effective_on DESC, progression.created_at DESC
      `,
    );

    return rows.map((row) => this.toProgressionSummary(row));
  }

  async createProgression(
    input: CreateMeritProgressionDto,
  ): Promise<MeritProgressionSummary> {
    this.ensureDatabase();

    const employee = await this.employeeReference(input.funcionarioId);
    const sourceReferenceId =
      input.referenciaOrigemId ?? employee.salary_reference_id;
    const targetReference = await this.salaryReference(
      input.referenciaDestinoId,
    );
    const sourceReference = sourceReferenceId
      ? await this.salaryReference(sourceReferenceId)
      : null;

    if (
      input.avaliacaoId &&
      !(await this.belongsToEmployee(
        'hr.performance_evaluation',
        input.avaliacaoId,
        input.funcionarioId,
      ))
    ) {
      throw new BadRequestException(
        'Performance evaluation does not belong to employee',
      );
    }

    const rows = await this.databaseService.query<MeritProgressionSqlRow>(
      `
      WITH inserted_progression AS (
        INSERT INTO hr.merit_progression (
          employee_id,
          performance_evaluation_id,
          source_salary_reference_id,
          target_salary_reference_id,
          effective_on,
          appointment_act,
          kind,
          justification,
          approved_by_ref
        )
        VALUES (
          $1::uuid,
          NULLIF($2, '')::uuid,
          NULLIF($3, '')::uuid,
          $4::uuid,
          $5::date,
          $6,
          $7::"ProgressionKind",
          $8,
          NULLIF($9, '')
        )
        RETURNING *
      ),
      updated_employee AS (
        UPDATE hr.employee
        SET salary_reference_id = $4::uuid,
            updated_at = now()
        WHERE id = $1::uuid
      ),
      inserted_history AS (
        INSERT INTO hr.salary_level_history (
          employee_id,
          salary_reference_id,
          level_code,
          level_description,
          adjustment_amount,
          effective_on
        )
        VALUES (
          $1::uuid,
          $4::uuid,
          $10,
          $11,
          $12::decimal,
          $5::date
        )
        RETURNING id
      )
      SELECT
        progression.id,
        progression.employee_id::text,
        employee.registration AS employee_registration,
        employee.name AS employee_name,
        progression.performance_evaluation_id::text,
        progression.source_salary_reference_id::text,
        source_reference.code AS source_salary_reference_code,
        progression.target_salary_reference_id::text,
        target_reference.code AS target_salary_reference_code,
        progression.effective_on,
        progression.appointment_act,
        progression.kind::text AS kind,
        progression.justification,
        progression.approved_by_ref
      FROM inserted_progression progression
      JOIN hr.employee employee ON employee.id = progression.employee_id
      LEFT JOIN hr.salary_reference source_reference
        ON source_reference.id = progression.source_salary_reference_id
      LEFT JOIN hr.salary_reference target_reference
        ON target_reference.id = progression.target_salary_reference_id
      `,
      [
        input.funcionarioId,
        input.avaliacaoId ?? '',
        sourceReferenceId ?? '',
        input.referenciaDestinoId,
        input.dataVigencia,
        input.atoNomeacao?.trim() ?? '',
        this.toProgressionKindDb(input.tipo),
        input.justificativa?.trim() ?? '',
        input.aprovadoPorId ?? '',
        targetReference.code,
        targetReference.description,
        this.moneyDiff(sourceReference?.amount ?? '0', targetReference.amount),
      ],
    );

    return this.toProgressionSummary(rows[0]);
  }

  async listSimulations(): Promise<SalarySimulationSummary[]> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<SalarySimulationSqlRow>(
      `
      SELECT
        simulation.id,
        simulation.employee_id::text,
        employee.registration AS employee_registration,
        employee.name AS employee_name,
        simulation.scenario,
        simulation.result_json,
        simulation.created_by_ref,
        simulation.created_at,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', adjustment.id::text,
                'descricao', adjustment.label,
                'percentual', adjustment.percent_adjustment,
                'valorFixo', adjustment.fixed_adjustment
              )
              ORDER BY adjustment.created_at ASC
            )
            FROM hr.salary_simulation_adjustment adjustment
            WHERE adjustment.simulation_id = simulation.id
          ),
          '[]'::jsonb
        ) AS adjustments
      FROM hr.salary_simulation simulation
      JOIN hr.employee employee ON employee.id = simulation.employee_id
      ORDER BY simulation.created_at DESC
      `,
    );

    return rows.map((row) => this.toSimulationSummary(row));
  }

  async createSimulation(
    input: CreateSalarySimulationDto,
    actorUsername?: string,
  ): Promise<SalarySimulationSummary> {
    this.ensureDatabase();

    const employee = await this.employeeReference(input.funcionarioId);
    const reference = employee.salary_reference_id
      ? await this.salaryReference(employee.salary_reference_id)
      : null;

    const baseAmount = Number(reference?.amount ?? '0');
    const adjustments = (input.ajustes ?? []).map((entry) => ({
      descricao: entry.descricao.trim(),
      percentual: entry.percentual ? Number(entry.percentual) : null,
      valorFixo: entry.valorFixo ? Number(entry.valorFixo) : null,
    }));
    const projectedAmount = adjustments.reduce((total, entry) => {
      const percentValue =
        entry.percentual == null ? 0 : total * (entry.percentual / 100);
      const fixedValue = entry.valorFixo ?? 0;
      return total + percentValue + fixedValue;
    }, baseAmount);
    const resultJson = {
      cenario: input.cenario.trim(),
      baseSalaryReferenceId: employee.salary_reference_id,
      baseAmount: this.toMoney(baseAmount),
      projectedAmount: this.toMoney(projectedAmount),
      variationAmount: this.toMoney(projectedAmount - baseAmount),
      variationPercent:
        baseAmount === 0
          ? 0
          : Number(
              (((projectedAmount - baseAmount) / baseAmount) * 100).toFixed(4),
            ),
      contexto: input.contexto ?? {},
    };

    const rows = await this.databaseService.query<SalarySimulationSqlRow>(
      `
      WITH inserted_simulation AS (
        INSERT INTO hr.salary_simulation (
          employee_id,
          scenario,
          result_json,
          created_by_ref
        )
        VALUES (
          $1::uuid,
          $2,
          $3::jsonb,
          NULLIF($4, '')
        )
        RETURNING *
      ),
      inserted_adjustments AS (
        INSERT INTO hr.salary_simulation_adjustment (
          simulation_id,
          label,
          percent_adjustment,
          fixed_adjustment
        )
        SELECT
          simulation.id,
          adjustment.descricao,
          adjustment.percentual::decimal,
          adjustment.valor_fixo::decimal
        FROM inserted_simulation simulation
        CROSS JOIN LATERAL jsonb_to_recordset($5::jsonb) AS adjustment(
          descricao text,
          percentual text,
          valor_fixo text
        )
        RETURNING *
      )
      SELECT
        simulation.id,
        simulation.employee_id::text,
        $6::text AS employee_registration,
        $7::text AS employee_name,
        simulation.scenario,
        simulation.result_json,
        simulation.created_by_ref,
        simulation.created_at,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', adjustment.id::text,
                'descricao', adjustment.label,
                'percentual', adjustment.percent_adjustment,
                'valorFixo', adjustment.fixed_adjustment
              )
              ORDER BY adjustment.created_at ASC
            )
            FROM inserted_adjustments adjustment
          ),
          '[]'::jsonb
        ) AS adjustments
      FROM inserted_simulation simulation
      `,
      [
        input.funcionarioId,
        input.cenario.trim(),
        JSON.stringify(resultJson),
        actorUsername ?? '',
        JSON.stringify(
          adjustments.map((entry) => ({
            descricao: entry.descricao,
            percentual:
              entry.percentual == null ? null : entry.percentual.toFixed(4),
            valor_fixo:
              entry.valorFixo == null ? null : entry.valorFixo.toFixed(2),
          })),
        ),
        employee.registration,
        employee.name,
      ],
    );

    return this.toSimulationSummary(rows[0]);
  }

  async listCareerPlans(): Promise<CareerPlanSummary[]> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<CareerPlanSqlRow>(
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

    return rows.map((row) => this.toCareerPlanSummary(row));
  }

  async createCareerPlan(
    input: CreateCareerPlanDto,
  ): Promise<CareerPlanSummary> {
    this.ensureDatabase();

    let employee: EmployeeReferenceRow | null = null;
    if (input.funcionarioId) {
      employee = await this.employeeReference(input.funcionarioId);
    }

    const rows = await this.databaseService.query<CareerPlanSqlRow>(
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

    return this.toCareerPlanSummary(rows[0]);
  }

  async updateCareerPlan(
    id: string,
    input: UpdateCareerPlanDto,
  ): Promise<CareerPlanSummary> {
    this.ensureDatabase();

    const rows = await this.databaseService.query<CareerPlanSqlRow>(
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
      const fallback = await this.databaseService.query<CareerPlanSqlRow>(
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
      return this.toCareerPlanSummary(fallback[0]);
    }

    return this.toCareerPlanSummary(rows[0]);
  }

  async requestEvaluationSheet(
    evaluationId: string,
    input: GenerateAvaliacaoReportDto,
  ) {
    this.ensureDatabase();
    const exists = await this.databaseService.query<QueryResultRow>(
      `SELECT 1 FROM hr.performance_evaluation WHERE id = $1::uuid`,
      [evaluationId],
    );
    if (!exists[0]) {
      throw new NotFoundException('Performance evaluation not found');
    }
    return this.createReportRequest(
      'AVALIACAO_FICHA_DESEMPENHO',
      'Ficha de avaliacao de desempenho',
      {
        evaluationId,
        format: input.formato ?? 'PDF',
      },
    );
  }

  async requestCycleReport(
    periodLabel: string,
    input: GenerateAvaliacaoReportDto,
  ) {
    this.ensureDatabase();
    return this.createReportRequest(
      'AVALIACAO_RELATORIO_CICLO',
      'Relatorio de ciclo de avaliacao',
      {
        periodLabel,
        workLocationId: input.lotacaoId ?? null,
        format: input.formato ?? 'PDF',
      },
    );
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private async employeeReference(
    employeeId: string,
  ): Promise<EmployeeReferenceRow> {
    const rows = await this.databaseService.query<EmployeeReferenceRow>(
      `
      SELECT
        id,
        registration,
        name,
        branch_id::text,
        work_location_id::text,
        job_position_id::text,
        job_function_id::text,
        salary_reference_id::text
      FROM hr.employee
      WHERE id = $1::uuid
      `,
      [employeeId],
    );
    const employee = rows[0];
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  private async salaryReference(id: string): Promise<SalaryReferenceAmountRow> {
    const rows = await this.databaseService.query<SalaryReferenceAmountRow>(
      `
      SELECT id, code, description, amount::text AS amount
      FROM hr.salary_reference
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Salary reference not found');
    }
    return rows[0];
  }

  private async belongsToEmployee(
    tableName: 'hr.performance_evaluation',
    id: string,
    employeeId: string,
  ): Promise<boolean> {
    const rows = await this.databaseService.query<QueryResultRow>(
      `SELECT 1 FROM ${tableName} WHERE id = $1::uuid AND employee_id = $2::uuid`,
      [id, employeeId],
    );
    return Boolean(rows[0]);
  }

  private toPerformanceEvaluationSummary(
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
      criterios: this.asArray(row.criteria),
      avaliadorId: row.evaluator_ref,
      dataAvaliacao: this.toIsoDate(row.evaluated_on),
      status: this.toEvaluationStatusInput(row.status),
      observacao: row.notes,
    };
  }

  private toProgressionSummary(
    row: MeritProgressionSqlRow,
  ): MeritProgressionSummary {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.employee_registration,
      nome: row.employee_name,
      avaliacaoId: row.performance_evaluation_id,
      referenciaOrigemId: row.source_salary_reference_id,
      referenciaOrigemCodigo: row.source_salary_reference_code,
      referenciaDestinoId: row.target_salary_reference_id,
      referenciaDestinoCodigo: row.target_salary_reference_code,
      dataVigencia: this.toIsoDate(row.effective_on),
      atoNomeacao: row.appointment_act,
      tipo: this.toProgressionKindInput(row.kind),
      justificativa: row.justification,
      aprovadoPor: row.approved_by_ref,
    };
  }

  private toSimulationSummary(
    row: SalarySimulationSqlRow,
  ): SalarySimulationSummary {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.employee_registration,
      nome: row.employee_name,
      cenario: row.scenario,
      resultado: this.asObject(row.result_json),
      criadoPor: row.created_by_ref,
      criadoEm: this.toIso(row.created_at),
      ajustes: this.asArray(row.adjustments) as Array<Record<string, unknown>>,
    };
  }

  private toCareerPlanSummary(row: CareerPlanSqlRow): CareerPlanSummary {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.employee_registration,
      nomeServidor: row.employee_name,
      nome: row.name,
      versao: row.version,
      dataVigencia: this.toIsoDate(row.effective_on),
      niveis: this.asObject(row.levels_json),
      referencias: this.asObject(row.references_json),
      ativo: row.active,
    };
  }

  private toEvaluationStatusDb(
    status: PerformanceEvaluationStatusInput,
  ): string {
    switch (status) {
      case 'RASCUNHO':
        return 'DRAFT';
      case 'SUBMETIDA':
        return 'SUBMITTED';
      case 'APROVADA':
        return 'APPROVED';
      case 'REPROVADA':
        return 'REJECTED';
    }
  }

  private toEvaluationStatusInput(
    value: string,
  ): PerformanceEvaluationStatusInput {
    switch (value) {
      case 'DRAFT':
        return 'RASCUNHO';
      case 'SUBMITTED':
        return 'SUBMETIDA';
      case 'APPROVED':
        return 'APROVADA';
      case 'REJECTED':
      default:
        return 'REPROVADA';
    }
  }

  private toProgressionKindDb(kind: ProgressionKindInput): string {
    switch (kind) {
      case 'MERITO':
        return 'MERIT';
      case 'TITULARIDADE':
        return 'TITLE';
      case 'JUDICIAL':
        return 'JUDICIAL';
      case 'CORRECAO':
        return 'CORRECTION';
    }
  }

  private toProgressionKindInput(value: string): ProgressionKindInput {
    switch (value) {
      case 'MERIT':
        return 'MERITO';
      case 'TITLE':
        return 'TITULARIDADE';
      case 'JUDICIAL':
        return 'JUDICIAL';
      case 'CORRECTION':
      default:
        return 'CORRECAO';
    }
  }

  private asArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return JSON.parse(value) as unknown[];
    }
    return [];
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string' && value.trim()) {
      return JSON.parse(value) as Record<string, unknown>;
    }
    return {};
  }

  private toIso(value: Date | string): string {
    return new Date(value).toISOString();
  }

  private toIsoDate(value: Date | string): string {
    return this.toIso(value).slice(0, 10);
  }

  private moneyDiff(source: string, target: string): string {
    return this.toMoney(Number(target) - Number(source));
  }

  private toMoney(value: number): string {
    return value.toFixed(2);
  }

  private async createReportRequest(
    code: string,
    name: string,
    parameters: Record<string, unknown>,
  ) {
    const definitionId = await this.ensureDefinition(
      code,
      name,
      `GENERATE request generated by avaliacao runtime for ${code}`,
    );
    const rows = await this.databaseService.query<ReportRequestRow>(
      `
      INSERT INTO public.report_request (
        definition_id,
        status,
        parameters
      )
      VALUES (
        $1::uuid,
        'REQUESTED'::"ReportRequestStatus",
        $2::jsonb
      )
      RETURNING id, status::text AS status, requested_at
      `,
      [definitionId, JSON.stringify(parameters)],
    );
    return {
      id: rows[0]?.id ?? '',
      status: rows[0]?.status ?? 'REQUESTED',
      requestedAt: this.toIso(rows[0]?.requested_at ?? new Date()),
    };
  }

  private async ensureDefinition(
    code: string,
    name: string,
    description: string,
  ): Promise<string> {
    const rows = await this.databaseService.query<
      { id: string } & QueryResultRow
    >(
      `
      WITH inserted AS (
        INSERT INTO public.report_definition (
          tenant_id,
          code,
          name,
          description,
          module_key,
          status
        )
        SELECT
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          $3,
          'avaliacao',
          'ACTIVE'::"RecordStatus"
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.report_definition
          WHERE code = $1
            AND tenant_id = public.sgp_current_tenant_uuid()
        )
        RETURNING id::text
      )
      SELECT id::text FROM inserted
      UNION ALL
      SELECT id::text
      FROM public.report_definition
      WHERE code = $1
        AND tenant_id = public.sgp_current_tenant_uuid()
      LIMIT 1
      `,
      [code, name, description],
    );
    return rows[0]?.id ?? '';
  }
}
