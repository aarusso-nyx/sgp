import type { QueryResultRow } from 'pg';

import { buildSimplePdfReport } from '../builders/document-report.builder';
import {
  IntegrationDispatchContext,
  IntegrationJobDispatcher,
  IntegrationProcessResult,
  PendingIntegrationJobRow,
} from './integration-job-dispatcher';
import { domainError } from '../../common/errors/domain-error';

interface EvaluationSheetRow extends QueryResultRow {
  evaluation_id: string;
  employee_name: string;
  registration: string;
  period_label: string;
  score: string;
  status: string;
  evaluated_on: Date | string;
  evaluator_ref: string;
}

interface EvaluationCycleRow extends QueryResultRow {
  period_label: string;
  total_evaluations: string;
  average_score: string;
  approved_count: string;
}

export class EvaluationIntegrationDispatcher implements IntegrationJobDispatcher {
  readonly definitions = [
    'AVALIACAO_FICHA_DESEMPENHO',
    'AVALIACAO_RELATORIO_CICLO',
  ] as const;

  process(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    switch (job.definition_code) {
      case 'AVALIACAO_FICHA_DESEMPENHO':
        return this.processEvaluationSheet(job, context);
      case 'AVALIACAO_RELATORIO_CICLO':
        return this.processEvaluationCycle(job, context);
      default:
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          `Unsupported evaluation job: ${job.definition_code}`,
        );
    }
  }

  private async processEvaluationSheet(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const evaluationId = context.requireString(job.parameters, 'evaluationId');
    const rows = await context.databaseService.query<EvaluationSheetRow>(
      `
      SELECT
        evaluation.id::text AS evaluation_id,
        employee.name AS employee_name,
        employee.registration,
        evaluation.period_label,
        evaluation.score::text AS score,
        evaluation.status::text AS status,
        evaluation.evaluated_on,
        evaluation.evaluator_ref
      FROM hr.performance_evaluation evaluation
      JOIN hr.employee employee ON employee.id = evaluation.employee_id
      WHERE evaluation.id = $1::uuid
      `,
      [evaluationId],
    );
    const row = rows[0];
    if (!row) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Performance evaluation report source not found',
      );
    }

    const artifact = buildSimplePdfReport({
      fileName: `avaliacao-${row.registration}-${row.period_label}.pdf`,
      title: 'Ficha de Avaliacao de Desempenho',
      lines: [
        `Funcionario: ${row.employee_name}`,
        `Matricula: ${row.registration}`,
        `Periodo: ${row.period_label}`,
        `Nota final: ${row.score}`,
        `Status: ${row.status}`,
        `Avaliador: ${row.evaluator_ref}`,
        `Data avaliacao: ${context.toDateString(row.evaluated_on)}`,
      ],
      recordCount: 1,
    });

    return context.persistDocumentResult(
      job,
      artifact,
      [job.tenant_id, 'outputs', 'avaliacao', 'fichas', artifact.fileName].join(
        '/',
      ),
      {
        operation: 'avaliacao.ficha.gerada',
        evaluationId,
      },
    );
  }

  private async processEvaluationCycle(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const periodLabel = context.requireString(job.parameters, 'periodLabel');
    const rows = await context.databaseService.query<EvaluationCycleRow>(
      `
      SELECT
        evaluation.period_label,
        count(*)::text AS total_evaluations,
        coalesce(avg(evaluation.score), 0)::text AS average_score,
        count(*) FILTER (
          WHERE evaluation.status = 'APPROVED'::"PerformanceEvaluationStatus"
        )::text AS approved_count
      FROM hr.performance_evaluation evaluation
      WHERE evaluation.period_label = $1
      GROUP BY evaluation.period_label
      `,
      [periodLabel],
    );
    const row = rows[0];
    if (!row) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Evaluation cycle report source not found',
      );
    }

    const artifact = buildSimplePdfReport({
      fileName: `relatorio-ciclo-${periodLabel.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`,
      title: 'Relatorio de Ciclo de Avaliacao',
      lines: [
        `Periodo: ${row.period_label}`,
        `Total avaliacoes: ${row.total_evaluations}`,
        `Media geral: ${Number(row.average_score).toFixed(2)}`,
        `Aprovadas: ${row.approved_count}`,
      ],
      recordCount: Number(row.total_evaluations),
    });

    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'avaliacao',
        'relatorios-ciclo',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'avaliacao.ciclo.relatorio.gerado',
        periodLabel,
      },
    );
  }
}
