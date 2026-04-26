import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  BlockedPaymentQueryDto,
  FinancialRecordQueryDto,
  FunctionalRecordQueryDto,
  OperationalHistoryQueryDto,
} from './consultas.dto';

interface FinancialRecordRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  competence_year: number;
  competence_month: number;
  total_earnings: string;
  total_deductions: string;
  net_amount: string;
  branch_name: string | null;
  work_location_name: string | null;
}

interface FunctionalRecordRow extends QueryResultRow {
  id: string;
  registration: string;
  employee_name: string;
  cpf: string | null;
  branch_name: string | null;
  work_location_name: string | null;
  job_position_name: string | null;
  job_function_name: string | null;
  functional_status_name: string | null;
  lifecycle_status: string;
  hired_on: Date | string | null;
  terminated_on: Date | string | null;
}

interface SituationReportRow extends QueryResultRow {
  lifecycle_status: string;
  functional_status_name: string | null;
  total: string;
}

interface BlockedPaymentRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  competence_year: number;
  competence_month: number;
  blocked_at: Date | string;
  released_at: Date | string | null;
  notes: string;
  reason_name: string | null;
}

interface OperationalHistoryRow extends QueryResultRow {
  id: string;
  occurred_at: Date | string;
  actor_login: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  table_name: string | null;
  metadata: unknown;
}

interface CountRow extends QueryResultRow {
  total: string;
}

export interface DashboardSummary {
  servidoresAtivos: number;
  folhasAbertas: number;
  pagamentosBloqueados: number;
  recadastramentosPendentes: number;
}

@Injectable()
export class ManagerialQueriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listFinancialRecords(query: FinancialRecordQueryDto) {
    this.ensureDatabase();

    const values: unknown[] = [];
    const clauses: string[] = [];
    if (query.funcionarioId) {
      values.push(query.funcionarioId);
      clauses.push(`record.employee_id = $${values.length}::uuid`);
    }
    if (query.competenciaAno != null) {
      values.push(query.competenciaAno);
      clauses.push(`record.competence_year = $${values.length}`);
    }
    if (query.competenciaMes != null) {
      values.push(query.competenciaMes);
      clauses.push(`record.competence_month = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await this.databaseService.query<FinancialRecordRow>(
      `
      SELECT
        record.id,
        record.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        record.competence_year,
        record.competence_month,
        record.total_earnings::text,
        record.total_deductions::text,
        record.net_amount::text,
        branch.name AS branch_name,
        work_location.name AS work_location_name
      FROM payroll.payroll_financial_record record
      JOIN hr.employee employee ON employee.id = record.employee_id
      LEFT JOIN hr.branch branch ON branch.id = record.branch_id
      LEFT JOIN hr.work_location work_location
        ON work_location.id = record.work_location_id
      ${where}
      ORDER BY record.competence_year DESC, record.competence_month DESC, employee.name ASC
      `,
      values,
    );

    return rows.map((row) => ({
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      competenciaAno: row.competence_year,
      competenciaMes: row.competence_month,
      totalProventos: Number(row.total_earnings),
      totalDescontos: Number(row.total_deductions),
      liquido: Number(row.net_amount),
      filial: row.branch_name,
      lotacao: row.work_location_name,
    }));
  }

  async listFunctionalRecords(query: FunctionalRecordQueryDto) {
    this.ensureDatabase();

    const values: unknown[] = [];
    const clauses: string[] = [];
    if (query.situacaoFuncionalId) {
      values.push(query.situacaoFuncionalId);
      clauses.push(`employee.functional_status_id = $${values.length}::uuid`);
    }
    if (query.lotacaoId) {
      values.push(query.lotacaoId);
      clauses.push(`employee.work_location_id = $${values.length}::uuid`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await this.databaseService.query<FunctionalRecordRow>(
      `
      SELECT
        employee.id,
        employee.registration,
        employee.name AS employee_name,
        employee.cpf,
        branch.name AS branch_name,
        work_location.name AS work_location_name,
        job_position.name AS job_position_name,
        job_function.name AS job_function_name,
        functional_status.description AS functional_status_name,
        employee.lifecycle_status::text AS lifecycle_status,
        employee.hired_on,
        employee.terminated_on
      FROM hr.employee employee
      LEFT JOIN hr.branch branch ON branch.id = employee.branch_id
      LEFT JOIN hr.work_location work_location
        ON work_location.id = employee.work_location_id
      LEFT JOIN hr.job_position job_position
        ON job_position.id = employee.job_position_id
      LEFT JOIN hr.job_function job_function
        ON job_function.id = employee.job_function_id
      LEFT JOIN hr.functional_status functional_status
        ON functional_status.id = employee.functional_status_id
      ${where}
      ORDER BY employee.name ASC
      `,
      values,
    );

    return rows.map((row) => ({
      id: row.id,
      matricula: row.registration,
      nome: row.employee_name,
      cpf: row.cpf,
      filial: row.branch_name,
      lotacao: row.work_location_name,
      cargo: row.job_position_name,
      funcao: row.job_function_name,
      situacaoFuncional: row.functional_status_name,
      situacaoCiclo: row.lifecycle_status,
      admitidoEm: row.hired_on ? this.toIsoDate(row.hired_on) : null,
      desligadoEm: row.terminated_on ? this.toIsoDate(row.terminated_on) : null,
    }));
  }

  async listSituationReports() {
    this.ensureDatabase();

    const rows = await this.databaseService.query<SituationReportRow>(
      `
      SELECT
        employee.lifecycle_status::text AS lifecycle_status,
        functional_status.description AS functional_status_name,
        count(*)::text AS total
      FROM hr.employee employee
      LEFT JOIN hr.functional_status functional_status
        ON functional_status.id = employee.functional_status_id
      GROUP BY employee.lifecycle_status, functional_status.description
      ORDER BY employee.lifecycle_status, functional_status.description NULLS LAST
      `,
    );

    return rows.map((row) => ({
      situacaoCiclo: row.lifecycle_status,
      situacaoFuncional: row.functional_status_name,
      total: Number(row.total),
    }));
  }

  async listBlockedPayments(query: BlockedPaymentQueryDto) {
    this.ensureDatabase();

    const values: unknown[] = [];
    const clauses: string[] = [];
    if (query.competenciaAno != null) {
      values.push(query.competenciaAno);
      clauses.push(`blocked.competence_year = $${values.length}`);
    }
    if (query.competenciaMes != null) {
      values.push(query.competenciaMes);
      clauses.push(`blocked.competence_month = $${values.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await this.databaseService.query<BlockedPaymentRow>(
      `
      SELECT
        blocked.id,
        blocked.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        blocked.competence_year,
        blocked.competence_month,
        blocked.blocked_at,
        blocked.released_at,
        blocked.notes,
        reason.description AS reason_name
      FROM payroll.blocked_payment blocked
      JOIN hr.employee employee ON employee.id = blocked.employee_id
      LEFT JOIN hr.reason reason ON reason.id = blocked.reason_id
      ${where}
      ORDER BY blocked.blocked_at DESC
      `,
      values,
    );

    return rows.map((row) => ({
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      competenciaAno: row.competence_year,
      competenciaMes: row.competence_month,
      bloqueadoEm: this.toIso(row.blocked_at),
      liberadoEm: row.released_at ? this.toIso(row.released_at) : null,
      motivo: row.reason_name,
      observacao: row.notes,
    }));
  }

  async listOperationalHistory(query: OperationalHistoryQueryDto) {
    this.ensureDatabase();

    const values: unknown[] = [];
    let where = '';
    if (query.recurso) {
      values.push(query.recurso);
      where =
        'WHERE ae.resource_type = $1 OR ae.table_name = $1 OR ae.resource_id::text = $1';
    }

    const rows = await this.databaseService.query<OperationalHistoryRow>(
      `
      SELECT
        ae.id,
        ae.occurred_at,
        ae.actor_login,
        ae.action::text AS action,
        ae.resource_type,
        ae.resource_id::text,
        ae.table_name,
        ae.metadata
      FROM public.audit_event ae
      ${where}
      ORDER BY ae.occurred_at DESC
      LIMIT 100
      `,
      values,
    );

    return rows.map((row) => ({
      id: row.id,
      ocorridoEm: this.toIso(row.occurred_at),
      usuario: row.actor_login,
      acao: row.action,
      recurso: row.resource_type,
      recursoId: row.resource_id,
      tabela: row.table_name,
      metadata:
        row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    }));
  }

  async dashboard(): Promise<DashboardSummary> {
    this.ensureDatabase();

    const [
      activeEmployees,
      activePayrollRuns,
      blockedPayments,
      recertifications,
    ] = await Promise.all([
      this.count(
        `SELECT count(*)::text AS total FROM hr.employee WHERE lifecycle_status = 'ACTIVE'::"EmployeeLifecycleStatus"`,
      ),
      this.count(
        `SELECT count(*)::text AS total FROM payroll.payroll_run WHERE status IN ('DRAFT'::"PayrollRunStatus", 'QUEUED'::"PayrollRunStatus", 'PROCESSING'::"PayrollRunStatus", 'APPROVED'::"PayrollRunStatus")`,
      ),
      this.count(
        `SELECT count(*)::text AS total FROM payroll.blocked_payment WHERE released_at IS NULL`,
      ),
      this.count(
        `SELECT count(*)::text AS total FROM hr.recertification_beneficiary WHERE status IN ('PENDING'::"RecertificationStatus", 'NEAR_DUE'::"RecertificationStatus", 'OVERDUE'::"RecertificationStatus")`,
      ),
    ]);

    return {
      servidoresAtivos: activeEmployees,
      folhasAbertas: activePayrollRuns,
      pagamentosBloqueados: blockedPayments,
      recadastramentosPendentes: recertifications,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private async count(sql: string): Promise<number> {
    const rows = await this.databaseService.query<CountRow>(sql);
    return Number(rows[0]?.total ?? 0);
  }

  private toIso(value: Date | string): string {
    return new Date(value).toISOString();
  }

  private toIsoDate(value: Date | string): string {
    return this.toIso(value).slice(0, 10);
  }
}
