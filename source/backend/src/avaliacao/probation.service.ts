import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import { CreateProbationEvaluationDto } from './avaliacao.dto';

interface ProbationRow extends QueryResultRow {
  id: string;
  employee_id: string;
  employee_registration: string;
  employee_name: string;
  period_start: Date | string;
  period_end: Date | string;
  score: string;
  decision: string;
  evaluator_id: string | null;
  notes: string;
}

interface DueRow extends QueryResultRow {
  employee_id: string;
  registration: string;
  name: string;
  exercise_on: Date | string;
  completes_on: Date | string;
  days_until_completion: number;
}

export interface ProbationEvaluation {
  id: string;
  funcionarioId: string;
  matricula: string;
  nome: string;
  periodoInicio: string;
  periodoFim: string;
  nota: string;
  decisao: string;
  avaliadorId: string | null;
  observacao: string;
}

@Injectable()
export class ProbationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createEvaluation(
    body: CreateProbationEvaluationDto,
  ): Promise<ProbationEvaluation> {
    this.ensureDatabase();
    const months = this.monthsBetween(body.periodoInicio, body.periodoFim);
    if (![12, 24, 36].includes(months)) {
      throw new BadRequestException(
        'Probation evaluation period must be 12, 24, or 36 months',
      );
    }

    const rows = await this.databaseService.query<ProbationRow>(
      `
      INSERT INTO hr.probation_evaluation (
        tenant_id, employee_id, period_start, period_end, score, decision, evaluator_id, notes
      )
      SELECT employee.tenant_id, employee.id, $2::date, $3::date, $4::numeric, $5, $6::uuid, COALESCE($7, '')
      FROM hr.employee employee
      JOIN hr.employment_link link ON link.id = employee.employment_link_id
      WHERE employee.id = $1::uuid
        AND link.contract_type = 'statutory'
      RETURNING
        id,
        employee_id,
        (SELECT registration FROM hr.employee WHERE id = employee_id) AS employee_registration,
        (SELECT name FROM hr.employee WHERE id = employee_id) AS employee_name,
        period_start,
        period_end,
        score::text,
        decision,
        evaluator_id::text,
        notes
      `,
      [
        body.funcionarioId,
        body.periodoInicio,
        body.periodoFim,
        body.nota,
        body.decisao,
        body.avaliadorId ?? null,
        body.observacao ?? '',
      ],
    );
    if (!rows[0]) {
      throw new NotFoundException('Statutory employee not found');
    }
    return this.toEvaluation(rows[0]);
  }

  async listDueForCompletion(referenceDate = new Date()): Promise<
    Array<{
      funcionarioId: string;
      matricula: string;
      nome: string;
      exercicioEm: string;
      completaEm: string;
      diasParaConclusao: number;
    }>
  > {
    this.ensureDatabase();
    const reference = referenceDate.toISOString().slice(0, 10);
    const rows = await this.databaseService.query<DueRow>(
      `
      SELECT
        employee.id AS employee_id,
        employee.registration,
        employee.name,
        contract.exercise_on,
        (contract.exercise_on + interval '36 months')::date AS completes_on,
        ((contract.exercise_on + interval '36 months')::date - $1::date)::int AS days_until_completion
      FROM hr.employee employee
      JOIN hr.employment_contract contract
        ON contract.employee_id = employee.id
       AND contract.status = 'ACTIVE'::"RecordStatus"
      JOIN hr.employment_link link ON link.id = contract.employment_link_id
      WHERE link.contract_type = 'statutory'
        AND contract.exercise_on IS NOT NULL
        AND (contract.exercise_on + interval '36 months')::date BETWEEN $1::date AND ($1::date + interval '90 days')::date
      ORDER BY completes_on ASC, employee.registration ASC
      `,
      [reference],
    );
    return rows.map((row) => ({
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.name,
      exercicioEm: this.toDate(row.exercise_on),
      completaEm: this.toDate(row.completes_on),
      diasParaConclusao: Number(row.days_until_completion),
    }));
  }

  private monthsBetween(start: string, end: string): number {
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    return (
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      endDate.getUTCMonth() -
      startDate.getUTCMonth()
    );
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }

  private toEvaluation(row: ProbationRow): ProbationEvaluation {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.employee_registration,
      nome: row.employee_name,
      periodoInicio: this.toDate(row.period_start),
      periodoFim: this.toDate(row.period_end),
      nota: row.score,
      decisao: row.decision,
      avaliadorId: row.evaluator_id,
      observacao: row.notes,
    };
  }

  private toDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }
}
