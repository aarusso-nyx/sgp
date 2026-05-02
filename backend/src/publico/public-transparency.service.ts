import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../common/pagination/paged-response';
import { DatabaseService } from '../database/database.service';

interface PayrollTransparencyRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  branch_code: string | null;
  payroll_type: string | null;
  employee_count: number;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class PublicTransparencyService {
  constructor(private readonly databaseService: DatabaseService) {}

  async payrollTransparency(
    tenant: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<unknown>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const countRows = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM portal.mv_payroll_run_summary
      WHERE tenant_slug = $1
      `,
      [tenant],
    );
    const rows = await this.databaseService.query<PayrollTransparencyRow>(
      `
      SELECT
        prs.id::text,
        prs.competence_year,
        prs.competence_month,
        prs.branch_code,
        prs.payroll_type,
        prs.employee_count,
        prs.total_earnings::text,
        prs.total_deductions::text,
        prs.total_net::text
      FROM portal.mv_payroll_run_summary prs
      WHERE prs.tenant_slug = $1
      ORDER BY prs.competence_year DESC, prs.competence_month DESC, prs.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [tenant, pageSize, offset],
    );

    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows.map((row) => ({
        tenant,
        id: row.id,
        competenceYear: row.competence_year,
        competenceMonth: row.competence_month,
        branchCode: row.branch_code,
        payrollType: row.payroll_type,
        employeeCount: row.employee_count,
        totalEarnings: row.total_earnings,
        totalDeductions: row.total_deductions,
        totalNet: row.total_net,
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
        'DATABASE_URL is required for transparency endpoints',
      );
    }
  }
}
