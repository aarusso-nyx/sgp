import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { CareerPlanService } from '../avaliacao/career-plan/career-plan.service';
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

interface EmployeeProfileRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  social_name: string | null;
  cpf: string | null;
  birth_date: Date | string | null;
  email: string | null;
  phone: string | null;
  pis_pasep: string | null;
  rg: string | null;
  rg_issuer: string | null;
  mother_name: string | null;
  father_name: string | null;
  address: Record<string, unknown>;
}

interface DependentRow extends QueryResultRow {
  id: string;
  name: string;
  cpf: string | null;
  birth_date: Date | string | null;
  relationship: string;
  income_tax_dependent: boolean;
  active: boolean;
}

interface DocumentRow extends QueryResultRow {
  id: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  checksum: string | null;
  created_at: Date | string;
}

interface MyJobRow extends QueryResultRow {
  job_position_code: string | null;
  job_position_name: string | null;
  class_number: number | null;
  level_number: number | null;
  base_salary: string | null;
}

interface IdRow extends QueryResultRow {
  id: string;
}

@Injectable()
export class PortalService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly careerPlanService: CareerPlanService,
  ) {}

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

  async getPersonalData(actor: AuthenticatedActor | undefined) {
    const employee = await this.loadEmployee(actor);
    return {
      id: employee.id,
      registration: employee.registration,
      name: employee.name,
      socialName: employee.social_name,
      cpf: employee.cpf,
      birthDate: employee.birth_date ? this.toDate(employee.birth_date) : null,
      pisPasep: employee.pis_pasep,
      rg: employee.rg,
      rgIssuer: employee.rg_issuer,
      motherName: employee.mother_name,
      fatherName: employee.father_name,
    };
  }

  async getAddress(actor: AuthenticatedActor | undefined) {
    const employee = await this.loadEmployee(actor);
    return employee.address ?? {};
  }

  async getContact(actor: AuthenticatedActor | undefined) {
    const employee = await this.loadEmployee(actor);
    return {
      email: employee.email,
      phone: employee.phone,
    };
  }

  async getDependents(actor: AuthenticatedActor | undefined) {
    const employee = await this.loadEmployee(actor);
    const rows = await this.databaseService.query<DependentRow>(
      `
      SELECT
        id::text,
        name,
        cpf,
        birth_date,
        relationship,
        income_tax_dependent,
        active
      FROM hr.employee_dependent
      WHERE employee_id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      ORDER BY name ASC
      `,
      [employee.id],
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      cpf: row.cpf,
      birthDate: row.birth_date ? this.toDate(row.birth_date) : null,
      relationship: row.relationship,
      incomeTaxDependent: row.income_tax_dependent,
      active: row.active,
    }));
  }

  async getDocuments(actor: AuthenticatedActor | undefined) {
    const employee = await this.loadEmployee(actor);
    const rows = await this.databaseService.query<DocumentRow>(
      `
      SELECT id::text, file_name, content_type, size_bytes, checksum, created_at
      FROM public.document_attachment
      WHERE owner_type = 'employee'
        AND owner_id = $1::text
        AND tenant_id = public.sgp_current_tenant_uuid()
      ORDER BY created_at DESC
      `,
      [employee.id],
    );
    return rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
      checksum: row.checksum,
      createdAt: this.toIso(row.created_at),
    }));
  }

  async getMyJob(actor: AuthenticatedActor | undefined) {
    const employee = await this.loadEmployee(actor);
    const rows = await this.databaseService.query<MyJobRow>(
      `
      SELECT
        jp.code AS job_position_code,
        jp.name AS job_position_name,
        l.class_number,
        l.level_number_fol02 AS level_number,
        l.base_salary::text
      FROM hr.employee e
      LEFT JOIN hr.job_position jp ON jp.id = e.job_position_id
      LEFT JOIN LATERAL (
        SELECT class_number, level_number_fol02, base_salary
        FROM hr.salary_range_level
        WHERE salary_range_id = jp.salary_range_id
        ORDER BY class_number, level_number_fol02
        LIMIT 1
      ) l ON true
      WHERE e.id = $1::uuid
      `,
      [employee.id],
    );
    const row = rows[0];
    return {
      cargo: row?.job_position_name ?? null,
      codigoCargo: row?.job_position_code ?? null,
      classe: row?.class_number ?? null,
      nivel: row?.level_number ?? null,
      vencimentoBasico: row?.base_salary ?? null,
    };
  }

  async getMyCareer(actor: AuthenticatedActor | undefined) {
    return this.careerPlanService.trailForActor(actor);
  }

  async requestProfileChange(
    actor: AuthenticatedActor | undefined,
    section: string,
    payload: Record<string, unknown>,
    previousPayload?: Record<string, unknown>,
  ) {
    const employee = await this.loadEmployee(actor);
    const previous = previousPayload ?? this.currentSection(employee, section);
    const rows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO hr.cadastral_change_request (
        employee_id,
        section,
        previous_payload,
        requested_payload,
        requested_by_sub,
        requested_by_login
      )
      VALUES (
        $1::uuid,
        $2,
        $3::jsonb,
        $4::jsonb,
        NULLIF($5, ''),
        NULLIF($6, '')
      )
      RETURNING id::text
      `,
      [
        employee.id,
        section,
        JSON.stringify(previous),
        JSON.stringify(payload),
        actor?.sub ?? '',
        actor?.username ?? '',
      ],
    );
    return {
      id: rows[0].id,
      status: 'PENDING',
      section,
      requestedPayload: payload,
      previousPayload: previous,
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

  private async loadEmployee(
    actor: AuthenticatedActor | undefined,
  ): Promise<EmployeeProfileRow> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EmployeeProfileRow>(
      `
      SELECT
        id::text,
        registration,
        name,
        social_name,
        cpf,
        birth_date,
        email,
        phone,
        pis_pasep,
        rg,
        rg_issuer,
        mother_name,
        father_name,
        address
      FROM hr.employee
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND (
          cpf = NULLIF($1, '')
          OR email = NULLIF($2, '')
          OR registration = NULLIF($3, '')
        )
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [
        this.claimString(actor, 'cpf'),
        this.claimString(actor, 'email'),
        actor?.username ?? '',
      ],
    );
    if (!rows[0]) {
      throw new NotFoundException(
        'Employee profile not found for portal actor',
      );
    }
    return rows[0];
  }

  private currentSection(
    employee: EmployeeProfileRow,
    section: string,
  ): Record<string, unknown> {
    if (section === 'endereco') return employee.address ?? {};
    if (section === 'contato') {
      return { email: employee.email, phone: employee.phone };
    }
    if (section === 'cadastro') return this.getPersonalDataFrom(employee);
    return {};
  }

  private claimString(
    actor: AuthenticatedActor | undefined,
    key: string,
  ): string {
    const value = actor?.claims?.[key];
    return typeof value === 'string' ? value : '';
  }

  private getPersonalDataFrom(
    employee: EmployeeProfileRow,
  ): Record<string, unknown> {
    return {
      socialName: employee.social_name,
      rg: employee.rg,
      rgIssuer: employee.rg_issuer,
      pisPasep: employee.pis_pasep,
      motherName: employee.mother_name,
      fatherName: employee.father_name,
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private toDate(value: Date | string): string {
    return this.toIso(value).slice(0, 10);
  }
}
