import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { AuthenticatedActor } from '../../auth/actor.types';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { MeusDadosService } from '../meus-dados/meus-dados.service';

interface PayrollSummaryRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  status: string;
  branch_code: string | null;
  branch_name: string | null;
  payroll_type_code: string | null;
  processing_type_code: string | null;
  employee_count: number;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
  created_at: Date | string;
  closed_at: Date | string | null;
}

interface VacationPayslipRow extends QueryResultRow {
  payroll_run_id: string;
  vacation_record_id: string;
  competence_year: number;
  competence_month: number;
  status: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

interface TerminationTermRow extends QueryResultRow {
  payroll_run_id: string;
  competence_year: number;
  competence_month: number;
  status: string;
  termination_date: Date | string | null;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
  components: PortalPaystubLine[];
}

export interface PortalPaystubLine {
  code: string;
  description: string;
  kind: string;
  quantity: string | number | null;
  referenceValue: string | number | null;
  amount: string | number;
  notes: string;
}

interface PaystubRow extends QueryResultRow {
  payroll_run_id: string;
  competence_year: number;
  competence_month: number;
  payroll_status: string;
  competence_status: string;
  registration: string;
  employee_name: string;
  total_earnings: string;
  total_deductions: string;
  net_amount: string;
  generated_at: Date | string;
  lines: PortalPaystubLine[];
}

export interface PortalPaystub {
  payrollRunId: string;
  competence: string;
  status: string;
  competenceStatus: string;
  employee: {
    id: string;
    registration: string;
    name: string;
  };
  totals: {
    earnings: string;
    deductions: string;
    net: string;
  };
  lines: PortalPaystubLine[];
  generatedAt: string;
  html: string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class ContrachequeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly meusDadosService: MeusDadosService,
  ) {}

  async vacationPayslips(actor: AuthenticatedActor | undefined) {
    const employee = await this.meusDadosService.loadEmployee(actor);
    const rows = await this.databaseService.query<VacationPayslipRow>(
      `
      SELECT
        run.id::text AS payroll_run_id,
        vacation.id::text AS vacation_record_id,
        run.competence_year,
        run.competence_month,
        run.status::text,
        run.total_earnings::text,
        run.total_deductions::text,
        run.total_net::text
      FROM hr.vacation_record vacation
      JOIN payroll.payroll_run run ON run.id = vacation.payroll_run_id
      JOIN payroll.processing_type processing ON processing.id = run.processing_type_id
      WHERE vacation.tenant_id = public.sgp_current_tenant_uuid()
        AND vacation.employee_id = $1::uuid
        AND processing.code = 'FERIAS'
        AND run.status IN ('GENERATED'::"PayrollRunStatus", 'APPROVED'::"PayrollRunStatus", 'PAID'::"PayrollRunStatus", 'CLOSED'::"PayrollRunStatus")
      ORDER BY run.competence_year DESC, run.competence_month DESC, run.created_at DESC
      `,
      [employee.id],
    );
    return rows.map((row) => ({
      payrollRunId: row.payroll_run_id,
      vacationRecordId: row.vacation_record_id,
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      status: row.status,
      totalEarnings: row.total_earnings,
      totalDeductions: row.total_deductions,
      totalNet: row.total_net,
    }));
  }

  async terminationTerms(actor: AuthenticatedActor | undefined) {
    const employee = await this.meusDadosService.loadEmployee(actor);
    const rows = await this.databaseService.query<TerminationTermRow>(
      `
      SELECT
        run.id::text AS payroll_run_id,
        run.competence_year,
        run.competence_month,
        run.status::text,
        employee.terminated_on AS termination_date,
        financial.total_earnings::text,
        financial.total_deductions::text,
        financial.net_amount::text AS total_net,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'code', earning.code,
              'description', earning.description,
              'kind', earning.kind::text,
              'quantity', item.quantity,
              'referenceValue', item.reference_value,
              'amount', item.amount,
              'notes', item.notes
            )
            ORDER BY earning.kind::text, earning.code
          ) FILTER (WHERE item.id IS NOT NULL),
          '[]'::jsonb
        ) AS components
      FROM payroll.payroll_run run
      JOIN payroll.processing_type processing_type
        ON processing_type.id = run.processing_type_id
      JOIN payroll.payroll_financial_record financial
        ON financial.tenant_id = run.tenant_id
       AND financial.payroll_run_id = run.id
      JOIN hr.employee employee
        ON employee.tenant_id = run.tenant_id
       AND employee.id = financial.employee_id
      LEFT JOIN payroll.v_payroll_run_line_active item
        ON item.tenant_id = run.tenant_id
       AND item.payroll_run_id = run.id
       AND item.employee_id = employee.id
      LEFT JOIN payroll.payroll_earning_deduction earning
        ON earning.id = item.earning_deduction_id
      WHERE employee.id = $1::uuid
        AND processing_type.code = 'RESCISAO'
        AND run.status IN ('GENERATED'::"PayrollRunStatus", 'CLOSED'::"PayrollRunStatus")
      GROUP BY
        run.id,
        run.competence_year,
        run.competence_month,
        run.status,
        employee.terminated_on,
        financial.total_earnings,
        financial.total_deductions,
        financial.net_amount
      ORDER BY run.competence_year DESC, run.competence_month DESC, run.updated_at DESC
      `,
      [employee.id],
    );

    return rows.map((row) => ({
      payrollRunId: row.payroll_run_id,
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      status: row.status,
      terminationDate: row.termination_date
        ? this.meusDadosService.toDate(row.termination_date)
        : null,
      totalEarnings: row.total_earnings,
      totalDeductions: row.total_deductions,
      totalNet: row.total_net,
      components: Array.isArray(row.components) ? row.components : [],
    }));
  }

  async getPaystub(
    actor: AuthenticatedActor | undefined,
    competence: string,
  ): Promise<PortalPaystub> {
    const employee = await this.meusDadosService.loadEmployee(actor);
    const parsed = this.parseCompetence(competence);
    const rows = await this.databaseService.query<PaystubRow>(
      `
      SELECT
        payroll_run_id::text,
        competence_year,
        competence_month,
        payroll_status,
        competence_status,
        registration,
        employee_name,
        total_earnings::text,
        total_deductions::text,
        net_amount::text,
        generated_at,
        lines
      FROM portal.v_employee_paystub
      WHERE employee_id = $1::uuid
        AND competence_year = $2
        AND competence_month = $3
      ORDER BY generated_at DESC
      LIMIT 1
      `,
      [employee.id, parsed.year, parsed.month],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(
        'Paystub is not available for this competence',
      );
    }
    const lines = Array.isArray(row.lines) ? row.lines : [];
    return {
      payrollRunId: row.payroll_run_id,
      competence: `${row.competence_year}-${String(row.competence_month).padStart(2, '0')}`,
      status: row.payroll_status,
      competenceStatus: row.competence_status,
      employee: {
        id: employee.id,
        registration: row.registration,
        name: row.employee_name,
      },
      totals: {
        earnings: row.total_earnings,
        deductions: row.total_deductions,
        net: row.net_amount,
      },
      lines,
      generatedAt: this.meusDadosService.toIso(row.generated_at),
      html: this.buildPaystubHtml(row, lines),
    };
  }

  async payrollSummary(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const countRows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM portal.mv_payroll_run_summary prs
      WHERE prs.tenant_id = public.sgp_current_tenant_uuid()
        AND (
          ($1 = '%%')
          OR lower(concat_ws(' ',
              coalesce(prs.branch_code, ''),
              coalesce(prs.branch_name, ''),
              coalesce(prs.payroll_type_code, ''),
              coalesce(prs.processing_type_code, '')
            )) LIKE $1
        )
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<PayrollSummaryRow>(
      `
      SELECT
        prs.id::text,
        prs.competence_year,
        prs.competence_month,
        prs.status::text,
        prs.branch_code,
        prs.branch_name,
        prs.payroll_type_code,
        prs.processing_type_code,
        prs.employee_count,
        prs.total_earnings::text,
        prs.total_deductions::text,
        prs.total_net::text,
        prs.created_at,
        prs.closed_at
      FROM portal.mv_payroll_run_summary prs
      WHERE prs.tenant_id = public.sgp_current_tenant_uuid()
        AND (
          ($1 = '%%')
          OR lower(concat_ws(' ',
              coalesce(prs.branch_code, ''),
              coalesce(prs.branch_name, ''),
              coalesce(prs.payroll_type_code, ''),
              coalesce(prs.processing_type_code, '')
            )) LIKE $1
        )
      ORDER BY prs.competence_year DESC, prs.competence_month DESC, prs.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows.map((row) => ({
        id: row.id,
        competenceYear: row.competence_year,
        competenceMonth: row.competence_month,
        status: row.status,
        branchCode: row.branch_code,
        branchName: row.branch_name,
        payrollTypeCode: row.payroll_type_code,
        processingTypeCode: row.processing_type_code,
        employeeCount: row.employee_count,
        totalEarnings: row.total_earnings,
        totalDeductions: row.total_deductions,
        totalNet: row.total_net,
        createdAt: this.meusDadosService.toIso(row.created_at),
        closedAt: row.closed_at
          ? this.meusDadosService.toIso(row.closed_at)
          : null,
      })),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for portal operations',
      );
    }
  }

  private parseCompetence(competence: string): { year: number; month: number } {
    const match = /^(\d{4})-(\d{2})$/.exec(competence);
    if (!match) {
      throw new NotFoundException('Paystub competence must use YYYY-MM');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year < 2000 || year > 2100 || month < 1 || month > 12) {
      throw new NotFoundException('Paystub competence is invalid');
    }
    return { year, month };
  }

  private buildPaystubHtml(
    row: PaystubRow,
    lines: PortalPaystubLine[],
  ): string {
    const lineRows = lines
      .map(
        (line) =>
          `<tr><td>${this.escapeHtml(line.code)}</td><td>${this.escapeHtml(line.description)}</td><td>${this.escapeHtml(line.kind)}</td><td>${this.escapeHtml(String(line.amount))}</td></tr>`,
      )
      .join('');
    return [
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8">',
      `<title>Contracheque ${row.competence_year}-${String(row.competence_month).padStart(2, '0')}</title>`,
      '<body>',
      `<h1>Contracheque ${this.escapeHtml(row.employee_name)}</h1>`,
      `<p>Matricula ${this.escapeHtml(row.registration)} - competencia ${row.competence_year}-${String(row.competence_month).padStart(2, '0')}</p>`,
      '<table><thead><tr><th>Codigo</th><th>Rubrica</th><th>Tipo</th><th>Valor</th></tr></thead>',
      `<tbody>${lineRows}</tbody></table>`,
      `<p>Proventos ${this.escapeHtml(row.total_earnings)} | Descontos ${this.escapeHtml(row.total_deductions)} | Liquido ${this.escapeHtml(row.net_amount)}</p>`,
      '</body></html>',
    ].join('');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
