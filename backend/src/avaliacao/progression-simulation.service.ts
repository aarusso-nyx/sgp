import { BadRequestException, Injectable } from '@nestjs/common';

import {
  CreateMeritProgressionDto,
  CreateSalarySimulationDto,
} from './avaliacao.dto';
import { AvaliacaoDataAccessService } from './avaliacao-data-access.service';
import {
  MeritProgressionSqlRow,
  MeritProgressionSummary,
  SalarySimulationSqlRow,
  SalarySimulationSummary,
} from './avaliacao.types';

@Injectable()
export class AvaliacaoProgressionSimulationService {
  constructor(private readonly data: AvaliacaoDataAccessService) {}

  async listProgressions(): Promise<MeritProgressionSummary[]> {
    this.data.ensureDatabase();

    const rows = await this.data.query<MeritProgressionSqlRow>(
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
    this.data.ensureDatabase();

    const employee = await this.data.employeeReference(input.funcionarioId);
    const sourceReferenceId =
      input.referenciaOrigemId ?? employee.salary_reference_id;
    const targetReference = await this.data.salaryReference(
      input.referenciaDestinoId,
    );
    const sourceReference = sourceReferenceId
      ? await this.data.salaryReference(sourceReferenceId)
      : null;

    if (
      input.avaliacaoId &&
      !(await this.data.belongsToEmployee(
        'hr.performance_evaluation',
        input.avaliacaoId,
        input.funcionarioId,
      ))
    ) {
      throw new BadRequestException(
        'Performance evaluation does not belong to employee',
      );
    }

    const rows = await this.data.query<MeritProgressionSqlRow>(
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
        this.data.toProgressionKindDb(input.tipo),
        input.justificativa?.trim() ?? '',
        input.aprovadoPorId ?? '',
        targetReference.code,
        targetReference.description,
        this.data.moneyDiff(
          sourceReference?.amount ?? '0',
          targetReference.amount,
        ),
      ],
    );

    return this.toProgressionSummary(rows[0]!);
  }

  async listSimulations(): Promise<SalarySimulationSummary[]> {
    this.data.ensureDatabase();

    const rows = await this.data.query<SalarySimulationSqlRow>(
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
    this.data.ensureDatabase();

    const employee = await this.data.employeeReference(input.funcionarioId);
    const reference = employee.salary_reference_id
      ? await this.data.salaryReference(employee.salary_reference_id)
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
      baseAmount: this.data.toMoney(baseAmount),
      projectedAmount: this.data.toMoney(projectedAmount),
      variationAmount: this.data.toMoney(projectedAmount - baseAmount),
      variationPercent:
        baseAmount === 0
          ? 0
          : Number(
              (((projectedAmount - baseAmount) / baseAmount) * 100).toFixed(4),
            ),
      contexto: input.contexto ?? {},
    };

    const rows = await this.data.query<SalarySimulationSqlRow>(
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

    return this.toSimulationSummary(rows[0]!);
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
      dataVigencia: this.data.toIsoDate(row.effective_on),
      atoNomeacao: row.appointment_act,
      tipo: this.data.toProgressionKindInput(row.kind),
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
      resultado: this.data.asObject(row.result_json),
      criadoPor: row.created_by_ref,
      criadoEm: this.data.toIso(row.created_at),
      ajustes: this.data.asArray(row.adjustments) as Array<
        Record<string, unknown>
      >,
    };
  }
}
