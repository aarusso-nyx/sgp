import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  AdmitEmployeeDto,
  EmployeeMutationDto,
  TerminateEmployeeDto,
} from './employees.dto';

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

interface AdmitRow extends EmployeeListRow {
  contract_id: string;
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

export interface EmployeeAdmissionResult {
  employeeId: string;
  employmentContractId: string;
  employee: EmployeeSummary;
}

export interface EmployeeDossier {
  funcionarioId: string;
  tipo: 'dossie';
  emitidoEm: string;
  status: 'AVAILABLE';
  employee: EmployeeSummary;
  statusHistory: Array<{
    id: string;
    functionalStatus: string;
    startsOn: string;
    endsOn: string | null;
    notes: string;
  }>;
  contracts: Array<{
    id: string;
    startsOn: string;
    endsOn: string | null;
    status: string;
  }>;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface StatusHistoryRow extends QueryResultRow {
  id: string;
  functional_status: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  notes: string;
}

interface ContractRow extends QueryResultRow {
  id: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  status: string;
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

  async admit(input: AdmitEmployeeDto): Promise<EmployeeAdmissionResult> {
    this.ensureDatabase();
    try {
      const row = await this.databaseService.transaction(async (client) => {
        const functionalStatusId =
          input.functionalStatusId ??
          (await this.ensureFunctionalStatus(client, {
            code: 'EM_EXERCICIO',
            description: 'Em exercicio',
            modality: 'ATIVO',
            kind: 'EXERCICIO',
            entersPayroll: true,
            lifecycleStatus: 'ACTIVE',
          }));
        const employmentLinkId =
          input.employmentLinkId ??
          (await this.ensureEmploymentLink(
            client,
            'ESTATUTARIO',
            'Estatutario',
          ));
        const contractTypeId =
          input.contractTypeId ??
          (await this.ensureContractType(client, 'EFETIVO', 'Efetivo'));

        const rows = await client.query<AdmitRow>(
          `
          WITH created_employee AS (
            INSERT INTO hr.employee (
              tenant_id,
              registration,
              name,
              social_name,
              cpf,
              email,
              phone,
              branch_id,
              work_location_id,
              job_position_id,
              job_function_id,
              functional_status_id,
              employment_link_id,
              contract_type_id,
              hired_on,
              lifecycle_status,
              pis_pasep,
              rg,
              mother_name,
              father_name
            )
            VALUES (
              public.sgp_current_tenant_uuid(),
              $1,
              $2,
              NULLIF($3, ''),
              NULLIF($4, ''),
              NULLIF($5, ''),
              NULLIF($6, ''),
              NULLIF($7, '')::uuid,
              NULLIF($8, '')::uuid,
              NULLIF($9, '')::uuid,
              NULLIF($10, '')::uuid,
              $11::uuid,
              $12::uuid,
              $13::uuid,
              $14::date,
              'ACTIVE'::"EmployeeLifecycleStatus",
              NULLIF($15, ''),
              NULLIF($16, ''),
              NULLIF($17, ''),
              NULLIF($18, '')
            )
            RETURNING *
          ),
          created_contract AS (
            INSERT INTO hr.employment_contract (
              tenant_id,
              employee_id,
              employment_link_id,
              contract_type_id,
              appointed_on,
              possession_on,
              exercise_on,
              starts_on,
              legal_basis,
              status
            )
            SELECT
              tenant_id,
              id,
              employment_link_id,
              contract_type_id,
              NULLIF($19, '')::date,
              NULLIF($20, '')::date,
              NULLIF($21, '')::date,
              $14::date,
              $22,
              'ACTIVE'::"RecordStatus"
            FROM created_employee
            RETURNING id
          )
          SELECT
            e.id::text,
            e.registration,
            e.name,
            e.cpf,
            e.email,
            e.lifecycle_status::text AS lifecycle_status,
            fs.description AS functional_status,
            b.name AS branch_name,
            true AS active,
            e.created_at,
            e.updated_at,
            c.id::text AS contract_id
          FROM created_employee e
          CROSS JOIN created_contract c
          LEFT JOIN hr.functional_status fs ON fs.id = e.functional_status_id
          LEFT JOIN hr.branch b ON b.id = e.branch_id
          `,
          [
            input.registration.trim(),
            input.name.trim(),
            input.socialName?.trim() ?? '',
            input.cpf?.trim() ?? '',
            input.email?.trim().toLowerCase() ?? '',
            input.phone?.trim() ?? '',
            input.branchId ?? '',
            input.workLocationId ?? '',
            input.jobPositionId ?? '',
            input.jobFunctionId ?? '',
            functionalStatusId,
            employmentLinkId,
            contractTypeId,
            input.hiredOn,
            input.pisPasep?.trim() ?? '',
            input.rg?.trim() ?? '',
            input.motherName?.trim() ?? '',
            input.fatherName?.trim() ?? '',
            input.appointedOn ?? '',
            input.possessionOn ?? '',
            input.exerciseOn ?? '',
            input.legalBasis?.trim() ?? '',
          ],
        );
        return rows.rows[0];
      });

      if (!row) {
        throw new ServiceUnavailableException(
          'Employee admission did not return a row',
        );
      }
      return {
        employeeId: row.id,
        employmentContractId: row.contract_id,
        employee: this.toSummary(row),
      };
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

  async getDossier(id: string): Promise<EmployeeDossier> {
    this.ensureDatabase();
    const [employees, statusHistory, contracts] =
      await this.databaseService.transaction(async (client) => {
        const employeeRows = await client.query<EmployeeListRow>(
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
          WHERE e.id = $1::uuid
          `,
          [id],
        );
        const historyRows = await client.query<StatusHistoryRow>(
          `
          SELECT
            h.id::text,
            fs.description AS functional_status,
            h.starts_on,
            h.ends_on,
            h.notes
          FROM hr.employee_status_history h
          JOIN hr.functional_status fs ON fs.id = h.functional_status_id
          WHERE h.employee_id = $1::uuid
          ORDER BY h.starts_on DESC, h.created_at DESC
          `,
          [id],
        );
        const contractRows = await client.query<ContractRow>(
          `
          SELECT id::text, starts_on, ends_on, status::text
          FROM hr.employment_contract
          WHERE employee_id = $1::uuid
          ORDER BY starts_on DESC, created_at DESC
          `,
          [id],
        );
        return [
          employeeRows.rows,
          historyRows.rows,
          contractRows.rows,
        ] as const;
      });
    const employee = employees[0];
    if (!employee) throw new NotFoundException('Employee not found');
    return {
      funcionarioId: id,
      tipo: 'dossie',
      emitidoEm: new Date().toISOString(),
      status: 'AVAILABLE',
      employee: this.toSummary(employee),
      statusHistory: statusHistory.map((row) => ({
        id: row.id,
        functionalStatus: row.functional_status,
        startsOn: this.toIso(row.starts_on),
        endsOn: row.ends_on ? this.toIso(row.ends_on) : null,
        notes: row.notes,
      })),
      contracts: contracts.map((row) => ({
        id: row.id,
        startsOn: this.toIso(row.starts_on),
        endsOn: row.ends_on ? this.toIso(row.ends_on) : null,
        status: row.status,
      })),
    };
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
    return this.databaseService.transaction(async (client) => {
      const functionalStatusId = await this.ensureFunctionalStatus(client, {
        code: 'DESLIGAMENTO',
        description: 'Desligamento',
        modality: 'RESCISAO',
        kind: 'DESLIGAMENTO',
        entersPayroll: false,
        lifecycleStatus: 'TERMINATED',
      });

      const rows = await client.query<EmployeeListRow>(
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

      const row = rows.rows[0];
      if (!row) throw new NotFoundException('Employee not found');

      await client.query(
        `
        UPDATE hr.employment_contract
        SET
          ends_on = $2::date,
          status = 'INACTIVE'::"RecordStatus",
          updated_at = now()
        WHERE employee_id = $1::uuid
          AND tenant_id = public.sgp_current_tenant_uuid()
          AND ends_on IS NULL
        `,
        [id, input.terminationDate],
      );

      await client.query(
        `
        SELECT public.sgp_append_audit_event(
          'PROCESS',
          'rh.employee',
          $1,
          NULL::uuid,
          NULLIF(current_setting('app.current_user_sub', true), ''),
          NULLIF(current_setting('app.current_login', true), ''),
          'hr.employee',
          NULLIF(current_setting('app.request_id', true), ''),
          jsonb_build_object('transition', 'termination', 'terminationDate', $2::text),
          $3,
          NULL::text,
          NULL::text
        )
        `,
        [id, input.terminationDate, input.justification?.trim() ?? null],
      );

      let payrollRunId: string | null = null;
      let payrollRunStatus: string | null = null;
      if (input.generateTerminationPayroll) {
        const payrollTypeId = await this.ensurePayrollType(client);
        const processingTypeId = await this.ensureProcessingType(
          client,
          payrollTypeId,
        );
        const terminatedAt = new Date(input.terminationDate);
        const runRows = await client.query<PayrollRunRefRow>(
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
        payrollRunId = runRows.rows[0]?.id ?? null;
        payrollRunStatus = runRows.rows[0]?.status ?? null;
      }

      return {
        employee: this.toSummary(row),
        payrollRunId,
        payrollRunStatus,
      };
    });
  }

  private async ensureFunctionalStatus(
    client: PoolClient,
    input: {
      code: string;
      description: string;
      modality: string;
      kind: string;
      entersPayroll: boolean;
      lifecycleStatus: string;
    },
  ): Promise<string> {
    const rows = await client.query<IdRow>(
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
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::"EmployeeLifecycleStatus",
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
      [
        input.code,
        input.description,
        input.modality,
        input.kind,
        input.entersPayroll,
        input.lifecycleStatus,
      ],
    );
    return rows.rows[0].id;
  }

  private async ensureEmploymentLink(
    client: PoolClient,
    code: string,
    name: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO hr.employment_link (tenant_id, code, name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET name = EXCLUDED.name, status = 'ACTIVE'::"RecordStatus", updated_at = now()
      RETURNING id::text
      `,
      [code, name],
    );
    return rows.rows[0].id;
  }

  private async ensureContractType(
    client: PoolClient,
    code: string,
    name: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO hr.contract_type (tenant_id, code, name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET name = EXCLUDED.name, status = 'ACTIVE'::"RecordStatus", updated_at = now()
      RETURNING id::text
      `,
      [code, name],
    );
    return rows.rows[0].id;
  }

  private async ensurePayrollType(client: PoolClient): Promise<string> {
    const rows = await client.query<IdRow>(
      `
      INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
      VALUES (public.sgp_current_tenant_uuid(), 'RESCISAO', 'Rescisao', 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description, status = 'ACTIVE'::"RecordStatus", updated_at = now()
      RETURNING id::text
      `,
    );
    return rows.rows[0].id;
  }

  private async ensureProcessingType(
    client: PoolClient,
    payrollTypeId: string,
  ): Promise<string> {
    const rows = await client.query<IdRow>(
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
    return rows.rows[0].id;
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
