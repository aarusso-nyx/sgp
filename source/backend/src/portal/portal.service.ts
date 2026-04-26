import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { AuthenticatedActor } from '../auth/auth.types';
import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../common/pagination/paged-response';
import { DatabaseService } from '../database/database.service';

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

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class PortalService {
  constructor(private readonly databaseService: DatabaseService) {}

  currentSession(actor: AuthenticatedActor | undefined) {
    return {
      actor,
      authenticated: Boolean(actor),
    };
  }

  govBrStatus() {
    return {
      provider: 'govbr',
      status: 'available',
      checkedAt: new Date().toISOString(),
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
        createdAt: this.toIso(row.created_at),
        closedAt: row.closed_at ? this.toIso(row.closed_at) : null,
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

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
