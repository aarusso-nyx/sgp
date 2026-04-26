import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { EmployeeMutationDto, TerminateEmployeeDto } from './employees.dto';

export interface EmployeeSummary {
  id: string;
  registration: string;
  name: string;
  cpf: string | null;
  email: string | null;
  lifecycleStatus: string;
  functionalStatus: string | null;
  branch: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeListRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  cpf: string | null;
  email: string | null;
  lifecycle_status: string;
  functional_status: string | null;
  branch_name: string | null;
  branch_id?: string | null;
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface PayrollRunRefRow extends QueryResultRow {
  id: string;
  status: string;
}

export interface EmployeeTerminationResult {
  employee: EmployeeSummary;
  payrollRunId: string | null;
  payrollRunStatus: string | null;
}

interface CountRow extends QueryResultRow {
  total: string;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<EmployeeSummary>> {
    this.ensureDatabase();

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.employee e
      LEFT JOIN hr.functional_status fs ON fs.id = e.functional_status_id
      LEFT JOIN hr.branch b ON b.id = e.branch_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              e.registration,
              e.name,
              coalesce(e.cpf, ''),
              coalesce(e.email, ''),
              coalesce(fs.description, ''),
              coalesce(b.name, '')
            )) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<EmployeeListRow>(
      `
      SELECT
        e.id,
        e.registration,
        e.name,
        e.cpf,
        e.email,
        e.lifecycle_status::text AS lifecycle_status,
        fs.description AS functional_status,
        b.name AS branch_name,
        (e.lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus") AS active,
        e.created_at,
        e.updated_at
      FROM hr.employee e
      LEFT JOIN hr.functional_status fs ON fs.id = e.functional_status_id
      LEFT JOIN hr.branch b ON b.id = e.branch_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              e.registration,
              e.name,
              coalesce(e.cpf, ''),
              coalesce(e.email, ''),
              coalesce(fs.description, ''),
              coalesce(b.name, '')
            )) LIKE $1
      ORDER BY e.registration ASC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async create(input: EmployeeMutationDto): Promise<EmployeeSummary> {
    this.ensureDatabase();
    try {
      const rows = await this.databaseService.query<EmployeeListRow>(
        `
        INSERT INTO hr.employee (
          registration,
          name,
          cpf,
          email,
          lifecycle_status
        )
        VALUES ($1, $2, $3, $4, $5::"EmployeeLifecycleStatus")
        RETURNING
          id,
          registration,
          name,
          cpf,
          email,
          lifecycle_status::text AS lifecycle_status,
          NULL::text AS functional_status,
          NULL::text AS branch_name,
          (lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus") AS active,
          created_at,
          updated_at
        `,
        [
          input.registration.trim(),
          input.name.trim(),
          input.cpf?.trim() || null,
          input.email?.trim().toLowerCase() || null,
          input.active === false ? 'TERMINATED' : 'ACTIVE',
        ],
      );
      return this.toSummary(rows[0]);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException(
          'An employee with this registration or CPF already exists',
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: EmployeeMutationDto,
  ): Promise<EmployeeSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EmployeeListRow>(
      `
      UPDATE hr.employee
      SET
        registration = $2,
        name = $3,
        cpf = $4,
        email = $5,
        lifecycle_status = $6::"EmployeeLifecycleStatus",
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        registration,
        name,
        cpf,
        email,
        lifecycle_status::text AS lifecycle_status,
        NULL::text AS functional_status,
        NULL::text AS branch_name,
        (lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus") AS active,
        created_at,
        updated_at
      `,
      [
        id,
        input.registration.trim(),
        input.name.trim(),
        input.cpf?.trim() || null,
        input.email?.trim().toLowerCase() || null,
        input.active === false ? 'TERMINATED' : 'ACTIVE',
      ],
    );

    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');
    return this.toSummary(row);
  }

  async deactivate(id: string): Promise<EmployeeSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<EmployeeListRow>(
      `
      UPDATE hr.employee
      SET lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
          terminated_on = CURRENT_DATE,
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        registration,
        name,
        cpf,
        email,
        lifecycle_status::text AS lifecycle_status,
        NULL::text AS functional_status,
        NULL::text AS branch_name,
        false AS active,
        created_at,
        updated_at
      `,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');
    return this.toSummary(row);
  }

  async terminate(
    id: string,
    input: TerminateEmployeeDto,
  ): Promise<EmployeeTerminationResult> {
    this.ensureDatabase();

    const statusRows = await this.databaseService.query<IdRow>(
      `
      INSERT INTO hr.functional_status (
        tenant_id,
        code,
        description,
        modality,
        kind,
        enters_payroll,
        lifecycle_status,
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        'DESLIGAMENTO',
        'Desligamento',
        'RESCISAO',
        'DESLIGAMENTO',
        false,
        'TERMINATED'::"EmployeeLifecycleStatus",
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        modality = EXCLUDED.modality,
        kind = EXCLUDED.kind,
        enters_payroll = EXCLUDED.enters_payroll,
        lifecycle_status = EXCLUDED.lifecycle_status,
        status = 'ACTIVE'::"RecordStatus",
        updated_at = now()
      RETURNING id::text
      `,
    );
    const functionalStatusId = statusRows[0]?.id;

    const rows = await this.databaseService.query<EmployeeListRow>(
      `
      UPDATE hr.employee
      SET
        lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
        functional_status_id = $2::uuid,
        termination_reason_id = $3::uuid,
        terminated_on = $4::date,
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        registration,
        name,
        cpf,
        email,
        lifecycle_status::text AS lifecycle_status,
        'Desligamento'::text AS functional_status,
        NULL::text AS branch_name,
        branch_id::text AS branch_id,
        false AS active,
        created_at,
        updated_at
      `,
      [
        id,
        functionalStatusId,
        input.terminationReasonId,
        input.terminationDate,
      ],
    );

    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');

    await this.databaseService.query(
      `
      INSERT INTO hr.employee_status_history (
        tenant_id,
        employee_id,
        functional_status_id,
        reason_id,
        starts_on,
        ends_on,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::date,
        NULL,
        $5
      )
      `,
      [
        id,
        functionalStatusId,
        input.terminationReasonId,
        input.terminationDate,
        input.justification?.trim() ?? '',
      ],
    );

    let payrollRunId: string | null = null;
    let payrollRunStatus: string | null = null;
    if (input.generateTerminationPayroll) {
      const payrollTypeRows = await this.databaseService.query<IdRow>(
        `
        INSERT INTO payroll.payroll_type (
          tenant_id,
          code,
          description,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          'RESCISAO',
          'Rescisao',
          'ACTIVE'::"RecordStatus"
        )
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET
          description = EXCLUDED.description,
          status = 'ACTIVE'::"RecordStatus",
          updated_at = now()
        RETURNING id::text
        `,
      );

      const payrollTypeId = payrollTypeRows[0]?.id;
      const processingTypeRows = await this.databaseService.query<IdRow>(
        `
        INSERT INTO payroll.processing_type (
          tenant_id,
          code,
          description,
          payroll_type_id,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          'RESCISAO',
          'Rescisao',
          $1::uuid,
          'ACTIVE'::"RecordStatus"
        )
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET
          description = EXCLUDED.description,
          payroll_type_id = EXCLUDED.payroll_type_id,
          status = 'ACTIVE'::"RecordStatus",
          updated_at = now()
        RETURNING id::text
        `,
        [payrollTypeId],
      );

      const processingTypeId = processingTypeRows[0]?.id;
      const terminatedAt = new Date(input.terminationDate);
      const runRows = await this.databaseService.query<PayrollRunRefRow>(
        `
        INSERT INTO payroll.payroll_run (
          tenant_id,
          competence_year,
          competence_month,
          branch_id,
          payroll_type_id,
          processing_type_id,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          NULLIF($3, '')::uuid,
          $4::uuid,
          $5::uuid,
          'DRAFT'::"PayrollRunStatus"
        )
        ON CONFLICT (
          tenant_id,
          competence_year,
          competence_month,
          branch_id,
          payroll_type_id,
          processing_type_id
        ) DO UPDATE
        SET updated_at = now()
        RETURNING id::text, status::text
        `,
        [
          terminatedAt.getUTCFullYear(),
          terminatedAt.getUTCMonth() + 1,
          row.branch_id ?? '',
          payrollTypeId,
          processingTypeId,
        ],
      );
      payrollRunId = runRows[0]?.id ?? null;
      payrollRunStatus = runRows[0]?.status ?? null;
    }

    return {
      employee: this.toSummary(row),
      payrollRunId,
      payrollRunStatus,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for employee operations',
      );
    }
  }

  private toSummary(row: EmployeeListRow): EmployeeSummary {
    return {
      id: row.id,
      registration: row.registration,
      name: row.name,
      cpf: row.cpf,
      email: row.email,
      lifecycleStatus: row.lifecycle_status,
      functionalStatus: row.functional_status,
      branch: row.branch_name,
      active: row.active,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
