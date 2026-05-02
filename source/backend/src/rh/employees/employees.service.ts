import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  AdmitEmployeeDto,
  ApproveCadastralChangeDto,
  ChangeContractRegimeDto,
  EmployeeMutationDto,
  RejectCadastralChangeDto,
  TerminateEmployeeDto,
  UpdateAbonoPermanenciaDto,
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
  abonoPermanenciaAtivo: boolean;
  abonoPermanenciaInicio: string | null;
  abonoPermanenciaFundamento: string | null;
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
  abono_permanencia_ativo?: boolean;
  abono_permanencia_inicio?: Date | string | null;
  abono_permanencia_fundamento?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface AbonoPermanenciaRow extends QueryResultRow {
  id: string;
  active: boolean;
  starts_on: Date | string | null;
  legal_basis: string | null;
  audit_event_id?: string;
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

interface EmployeeRegimeRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  registration: string;
  name: string;
  functional_status_id: string | null;
}

interface RegimeChangeRow extends QueryResultRow {
  employee_id: string;
  employment_link_id: string;
  employment_contract_id: string;
  contract_type: string;
  effective_on: Date | string;
  end_date: Date | string | null;
  status_history_id: string;
  audit_event_id: string;
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

export interface ContractRegimeChangeResult {
  employeeId: string;
  employmentLinkId: string;
  employmentContractId: string;
  contractType: string;
  effectiveOn: string;
  endDate: string | null;
  statusHistoryId: string;
  auditEventId: string;
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

interface CadastralChangeRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  section: string;
  status: string;
  previous_payload: Record<string, unknown>;
  requested_payload: Record<string, unknown>;
  decision_notes: string | null;
  requested_by_sub: string | null;
  requested_by_login: string | null;
  decided_by_sub: string | null;
  decided_by_login: string | null;
  requested_at: Date | string;
  decided_at: Date | string | null;
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
        e.updated_at,
        e.abono_permanencia_ativo,
        e.abono_permanencia_inicio,
        e.abono_permanencia_fundamento
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

  async listCadastralChanges(
    status = 'PENDING',
  ): Promise<Array<Record<string, unknown>>> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CadastralChangeRow>(
      `
      SELECT
        c.id::text,
        c.employee_id::text,
        e.registration,
        e.name AS employee_name,
        c.section,
        c.status,
        c.previous_payload,
        c.requested_payload,
        c.decision_notes,
        c.requested_by_sub,
        c.requested_by_login,
        c.decided_by_sub,
        c.decided_by_login,
        c.requested_at,
        c.decided_at
      FROM hr.cadastral_change_request c
      JOIN hr.employee e ON e.id = c.employee_id
      WHERE c.tenant_id = public.sgp_current_tenant_uuid()
        AND c.status = $1::"CadastralChangeStatus"
      ORDER BY c.requested_at ASC
      `,
      [status.toUpperCase()],
    );
    return rows.map((row) => this.toCadastralChange(row));
  }

  async approveCadastralChange(
    id: string,
    body: ApproveCadastralChangeDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.databaseService.transaction(async (client) => {
      const existing = await client.query<CadastralChangeRow>(
        `
        SELECT
          c.id::text,
          c.employee_id::text,
          e.registration,
          e.name AS employee_name,
          c.section,
          c.status,
          c.previous_payload,
          c.requested_payload,
          c.decision_notes,
          c.requested_by_sub,
          c.requested_by_login,
          c.decided_by_sub,
          c.decided_by_login,
          c.requested_at,
          c.decided_at
        FROM hr.cadastral_change_request c
        JOIN hr.employee e ON e.id = c.employee_id
        WHERE c.id = $1::uuid
          AND c.tenant_id = public.sgp_current_tenant_uuid()
        FOR UPDATE OF c
        `,
        [id],
      );
      const current = existing.rows[0];
      if (!current) {
        throw new NotFoundException('Cadastral change request not found');
      }
      if (current.status !== 'PENDING') {
        throw new ConflictException('Cadastral change request is not pending');
      }

      await this.applyCadastralPayload(
        client,
        current.employee_id,
        current.section,
        current.requested_payload,
      );

      const approved = await client.query<CadastralChangeRow>(
        `
        UPDATE hr.cadastral_change_request
        SET
          status = 'APPROVED'::"CadastralChangeStatus",
          decision_notes = COALESCE($2, ''),
          decided_by_sub = NULLIF(current_setting('app.current_user_sub', true), ''),
          decided_by_login = NULLIF(current_setting('app.current_login', true), ''),
          decided_at = now(),
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING
          id::text,
          employee_id::text,
          $3::text AS registration,
          $4::text AS employee_name,
          section,
          status::text,
          previous_payload,
          requested_payload,
          decision_notes,
          requested_by_sub,
          requested_by_login,
          decided_by_sub,
          decided_by_login,
          requested_at,
          decided_at
        `,
        [id, body.notes ?? null, current.registration, current.employee_name],
      );

      await client.query(
        `
        SELECT public.sgp_append_audit_event(
          'UPDATE',
          'hr.cadastral_change_request',
          $1::text,
          jsonb_build_object('status', 'PENDING'),
          jsonb_build_object('status', 'APPROVED', 'section', $2::text)
        )
        `,
        [id, current.section],
      );

      return approved.rows;
    });

    return this.toCadastralChange(rows[0]);
  }

  async rejectCadastralChange(
    id: string,
    body: RejectCadastralChangeDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CadastralChangeRow>(
      `
      UPDATE hr.cadastral_change_request
      SET
        status = 'REJECTED'::"CadastralChangeStatus",
        decision_notes = $2,
        decided_by_sub = NULLIF(current_setting('app.current_user_sub', true), ''),
        decided_by_login = NULLIF(current_setting('app.current_login', true), ''),
        decided_at = now(),
        updated_at = now()
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
        AND status = 'PENDING'::"CadastralChangeStatus"
      RETURNING
        id::text,
        employee_id::text,
        ''::text AS registration,
        ''::text AS employee_name,
        section,
        status::text,
        previous_payload,
        requested_payload,
        decision_notes,
        requested_by_sub,
        requested_by_login,
        decided_by_sub,
        decided_by_login,
        requested_at,
        decided_at
      `,
      [id, body.reason],
    );
    if (!rows[0]) {
      throw new NotFoundException('Pending cadastral change request not found');
    }
    return this.toCadastralChange(rows[0]);
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
          ),
          created_admission_aso AS (
            INSERT INTO saude.aso_record (
              tenant_id,
              employee_id,
              aso_kind,
              scheduled_at,
              status
            )
            SELECT
              tenant_id,
              id,
              'ADMISSIONAL'::saude.aso_kind,
              COALESCE(NULLIF($21, '')::date, $14::date)::timestamptz,
              'SCHEDULED'::saude.aso_status
            FROM created_employee
            RETURNING id
          ),
          created_periodic_aso AS (
            INSERT INTO saude.aso_record (
              tenant_id,
              employee_id,
              aso_kind,
              scheduled_at,
              next_exam_due_at,
              status
            )
            SELECT
              e.tenant_id,
              e.id,
              'PERIODICO'::saude.aso_kind,
              COALESCE(NULLIF($21, '')::date, $14::date)::timestamptz,
              (
                COALESCE(NULLIF($21, '')::date, $14::date)
                + make_interval(months => max(COALESCE(pre.periodicity_months_override, me.periodicity_months, 12)))
              )::timestamptz,
              'SCHEDULED'::saude.aso_status
            FROM created_employee e
            JOIN saude.health_program hp
              ON hp.tenant_id = e.tenant_id
             AND hp.work_location_id = e.work_location_id
             AND hp.kind = 'PCMSO'::saude.health_program_kind
             AND hp.status = 'ACTIVE'::saude.program_status
            JOIN saude.pcmso_required_exam pre
              ON pre.health_program_id = hp.id
             AND pre.tenant_id = e.tenant_id
             AND (pre.applies_to_role_id IS NULL OR pre.applies_to_role_id = e.job_position_id)
            JOIN saude.medical_exam me ON me.id = pre.medical_exam_id
            GROUP BY e.tenant_id, e.id
            RETURNING id
          ),
          created_periodic_items AS (
            INSERT INTO saude.aso_exam_item (
              tenant_id,
              aso_record_id,
              medical_exam_id
            )
            SELECT
              e.tenant_id,
              periodic.id,
              pre.medical_exam_id
            FROM created_employee e
            JOIN created_periodic_aso periodic ON true
            JOIN saude.health_program hp
              ON hp.tenant_id = e.tenant_id
             AND hp.work_location_id = e.work_location_id
             AND hp.kind = 'PCMSO'::saude.health_program_kind
             AND hp.status = 'ACTIVE'::saude.program_status
            JOIN saude.pcmso_required_exam pre
              ON pre.health_program_id = hp.id
             AND pre.tenant_id = e.tenant_id
             AND (pre.applies_to_role_id IS NULL OR pre.applies_to_role_id = e.job_position_id)
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

  async getAbonoPermanencia(id: string): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AbonoPermanenciaRow>(
      `
      SELECT
        id::text,
        abono_permanencia_ativo AS active,
        abono_permanencia_inicio AS starts_on,
        abono_permanencia_fundamento AS legal_basis,
        updated_at
      FROM hr.employee
      WHERE id = $1::uuid
        AND tenant_id = public.sgp_current_tenant_uuid()
      `,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Employee not found');
    return this.toAbonoPermanencia(row);
  }

  async updateAbonoPermanencia(
    id: string,
    input: UpdateAbonoPermanenciaDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    if (input.active && !input.startsOn) {
      throw new BadRequestException(
        'startsOn is required when abono is active',
      );
    }
    if (input.active && !input.legalBasis?.trim()) {
      throw new BadRequestException(
        'legalBasis is required when abono is active',
      );
    }

    const row = await this.databaseService.transaction(async (client) => {
      const updated = await client.query<AbonoPermanenciaRow>(
        `
        WITH previous AS (
          SELECT
            id,
            abono_permanencia_ativo,
            abono_permanencia_inicio,
            abono_permanencia_fundamento
          FROM hr.employee
          WHERE id = $1::uuid
            AND tenant_id = public.sgp_current_tenant_uuid()
          FOR UPDATE
        ),
        changed AS (
          UPDATE hr.employee employee
          SET
            abono_permanencia_ativo = $2,
            abono_permanencia_inicio = CASE WHEN $2 THEN $3::date ELSE NULL END,
            abono_permanencia_fundamento = NULLIF($4, ''),
            updated_at = now()
          FROM previous
          WHERE employee.id = previous.id
          RETURNING
            employee.id,
            employee.abono_permanencia_ativo,
            employee.abono_permanencia_inicio,
            employee.abono_permanencia_fundamento,
            employee.updated_at,
            previous.abono_permanencia_ativo AS previous_active,
            previous.abono_permanencia_inicio AS previous_starts_on,
            previous.abono_permanencia_fundamento AS previous_legal_basis
        ),
        audit AS (
          SELECT public.sgp_append_audit_event(
            'UPDATE',
            'hr.employee.abono_permanencia',
            $1::text,
            NULL::uuid,
            NULLIF(current_setting('app.current_user_sub', true), ''),
            NULLIF(current_setting('app.current_login', true), ''),
            'hr.employee',
            NULLIF(current_setting('app.request_id', true), ''),
            jsonb_build_object(
              'event', CASE WHEN $2 THEN 'abono_permanencia.activated' ELSE 'abono_permanencia.deactivated' END,
              'previous', jsonb_build_object(
                'active', changed.previous_active,
                'startsOn', changed.previous_starts_on,
                'legalBasis', changed.previous_legal_basis
              ),
              'current', jsonb_build_object(
                'active', changed.abono_permanencia_ativo,
                'startsOn', changed.abono_permanencia_inicio,
                'legalBasis', changed.abono_permanencia_fundamento
              )
            ),
            NULLIF($4, ''),
            NULL::text,
            NULL::text
          ) AS id
          FROM changed
        )
        SELECT
          changed.id::text,
          changed.abono_permanencia_ativo AS active,
          changed.abono_permanencia_inicio AS starts_on,
          changed.abono_permanencia_fundamento AS legal_basis,
          changed.updated_at,
          audit.id::text AS audit_event_id
        FROM changed
        CROSS JOIN audit
        `,
        [
          id,
          input.active,
          input.startsOn ?? null,
          input.legalBasis?.trim() ?? '',
        ],
      );
      return updated.rows[0];
    });

    if (!row) throw new NotFoundException('Employee not found');
    AuditMutationContextStore.markMutationAudited();
    return this.toAbonoPermanencia(row);
  }

  async changeContractRegime(
    employeeId: string,
    input: ChangeContractRegimeDto,
  ): Promise<ContractRegimeChangeResult> {
    this.ensureDatabase();
    this.validateContractRegime(input);

    return this.databaseService.transaction(async (client) => {
      const employeeRows = await client.query<EmployeeRegimeRow>(
        `
        SELECT
          id::text,
          tenant_id::text,
          registration,
          name,
          functional_status_id::text
        FROM hr.employee
        WHERE id = $1::uuid
          AND tenant_id = public.sgp_current_tenant_uuid()
        FOR UPDATE
        `,
        [employeeId],
      );
      const employee = employeeRows.rows[0];
      if (!employee) throw new NotFoundException('Employee not found');

      const functionalStatusId =
        input.functionalStatusId ??
        employee.functional_status_id ??
        (await this.ensureFunctionalStatus(client, {
          code: 'EM_EXERCICIO',
          description: 'Em exercicio',
          modality: 'ATIVO',
          kind: 'EXERCICIO',
          entersPayroll: true,
          lifecycleStatus: 'ACTIVE',
        }));
      const contractTypeId = await this.ensureContractType(
        client,
        this.contractTypeCode(input.contractType),
        this.contractTypeLabel(input.contractType),
      );

      const code = [
        'REGIME',
        employee.registration.replace(/[^A-Za-z0-9]+/g, '-').toUpperCase(),
        input.contractType.toUpperCase(),
        input.effectiveOn.replace(/[^0-9]/g, ''),
      ].join('-');
      const linkRows = await client.query<IdRow>(
        `
        INSERT INTO hr.employment_link (
          tenant_id,
          code,
          name,
          contract_type,
          end_date,
          commission_position_id,
          regime_law_reference,
          functional_status_id,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          $3,
          NULLIF($4, '')::date,
          NULLIF($5, '')::uuid,
          NULLIF($6, ''),
          $7::uuid,
          'ACTIVE'::"RecordStatus"
        )
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET
          name = EXCLUDED.name,
          contract_type = EXCLUDED.contract_type,
          end_date = EXCLUDED.end_date,
          commission_position_id = EXCLUDED.commission_position_id,
          regime_law_reference = EXCLUDED.regime_law_reference,
          functional_status_id = EXCLUDED.functional_status_id,
          status = 'ACTIVE'::"RecordStatus",
          updated_at = now()
        RETURNING id::text
        `,
        [
          code,
          this.contractTypeLabel(input.contractType),
          input.contractType,
          input.endDate ?? '',
          input.commissionPositionId ?? '',
          input.regimeLawReference?.trim() ?? '',
          functionalStatusId,
        ],
      );
      const employmentLinkId = linkRows.rows[0].id;

      const changeRows = await client.query<RegimeChangeRow>(
        `
        WITH closed_contracts AS (
          UPDATE hr.employment_contract
          SET
            ends_on = $2::date,
            status = 'INACTIVE'::"RecordStatus",
            updated_at = now()
          WHERE employee_id = $1::uuid
            AND tenant_id = public.sgp_current_tenant_uuid()
            AND ends_on IS NULL
        ),
        updated_employee AS (
          UPDATE hr.employee
          SET
            employment_link_id = $3::uuid,
            contract_type_id = $4::uuid,
            updated_at = now()
          WHERE id = $1::uuid
            AND tenant_id = public.sgp_current_tenant_uuid()
          RETURNING id, tenant_id
        ),
        created_contract AS (
          INSERT INTO hr.employment_contract (
            tenant_id,
            employee_id,
            employment_link_id,
            contract_type_id,
            starts_on,
            ends_on,
            legal_basis,
            status
          )
          SELECT
            tenant_id,
            id,
            $3::uuid,
            $4::uuid,
            $2::date,
            NULLIF($5, '')::date,
            $6,
            'ACTIVE'::"RecordStatus"
          FROM updated_employee
          RETURNING id
        ),
        history AS (
          INSERT INTO hr.employee_status_history (
            tenant_id,
            employee_id,
            functional_status_id,
            starts_on,
            ends_on,
            notes
          )
          SELECT
            tenant_id,
            id,
            $7::uuid,
            $2::date,
            NULLIF($5, '')::date,
            concat('Alteracao de regime juridico: ', $8::text)
          FROM updated_employee
          RETURNING id
        ),
        audit AS (
          SELECT public.sgp_append_audit_event(
            'PROCESS',
            'rh.employment_link',
            $3::text,
            NULL::uuid,
            NULLIF(current_setting('app.current_user_sub', true), ''),
            NULLIF(current_setting('app.current_login', true), ''),
            'hr.employment_link',
            NULLIF(current_setting('app.request_id', true), ''),
            jsonb_build_object(
              'employeeId', $1::text,
              'contractType', $8::text,
              'effectiveOn', $2::text,
              'endDate', NULLIF($5, ''),
              'employmentContractId', (SELECT id::text FROM created_contract),
              'statusHistoryId', (SELECT id::text FROM history)
            ),
            NULLIF($9, ''),
            NULL::text,
            NULL::text
          ) AS id
        )
        SELECT
          $1::text AS employee_id,
          $3::text AS employment_link_id,
          (SELECT id::text FROM created_contract) AS employment_contract_id,
          $8::text AS contract_type,
          $2::date AS effective_on,
          NULLIF($5, '')::date AS end_date,
          (SELECT id::text FROM history) AS status_history_id,
          (SELECT id::text FROM audit) AS audit_event_id
        `,
        [
          employeeId,
          input.effectiveOn,
          employmentLinkId,
          contractTypeId,
          input.endDate ?? '',
          input.regimeLawReference?.trim() ?? '',
          functionalStatusId,
          input.contractType,
          input.justification?.trim() ?? '',
        ],
      );

      const row = changeRows.rows[0];
      AuditMutationContextStore.markMutationAudited();
      return {
        employeeId: row.employee_id,
        employmentLinkId: row.employment_link_id,
        employmentContractId: row.employment_contract_id,
        contractType: row.contract_type,
        effectiveOn: this.toIso(row.effective_on),
        endDate: row.end_date ? this.toIso(row.end_date) : null,
        statusHistoryId: row.status_history_id,
        auditEventId: row.audit_event_id,
      };
    });
  }

  private validateContractRegime(input: ChangeContractRegimeDto): void {
    if (input.contractType === 'temporary' && !input.endDate) {
      throw new BadRequestException(
        'Temporary contracts require endDate under Lei 8.745/93',
      );
    }
    if (input.contractType === 'commissioned' && !input.commissionPositionId) {
      throw new BadRequestException(
        'Commissioned contracts require commissionPositionId',
      );
    }
    if (
      input.contractType === 'statutory' &&
      !input.regimeLawReference?.trim()
    ) {
      throw new BadRequestException(
        'Statutory contracts require regimeLawReference',
      );
    }
  }

  private contractTypeCode(
    contractType: ChangeContractRegimeDto['contractType'],
  ): string {
    return {
      statutory: 'ESTATUTARIO',
      celetista: 'CELETISTA',
      commissioned: 'COMISSIONADO',
      temporary: 'TEMPORARIO',
    }[contractType];
  }

  private contractTypeLabel(
    contractType: ChangeContractRegimeDto['contractType'],
  ): string {
    return {
      statutory: 'Estatutario',
      celetista: 'Celetista',
      commissioned: 'Comissionado',
      temporary: 'Temporario Lei 8.745/93',
    }[contractType];
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

  private async applyCadastralPayload(
    client: PoolClient,
    employeeId: string,
    section: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (section === 'endereco') {
      await client.query(
        `
        UPDATE hr.employee
        SET address = $2::jsonb, updated_at = now()
        WHERE id = $1::uuid AND tenant_id = public.sgp_current_tenant_uuid()
        `,
        [employeeId, JSON.stringify(payload)],
      );
      return;
    }

    if (section === 'contato') {
      await client.query(
        `
        UPDATE hr.employee
        SET
          email = COALESCE(NULLIF($2, ''), email),
          phone = COALESCE(NULLIF($3, ''), phone),
          updated_at = now()
        WHERE id = $1::uuid AND tenant_id = public.sgp_current_tenant_uuid()
        `,
        [
          employeeId,
          this.stringValue(payload.email),
          this.stringValue(payload.phone),
        ],
      );
      return;
    }

    if (section === 'cadastro') {
      await client.query(
        `
        UPDATE hr.employee
        SET
          social_name = COALESCE(NULLIF($2, ''), social_name),
          rg = COALESCE(NULLIF($3, ''), rg),
          rg_issuer = COALESCE(NULLIF($4, ''), rg_issuer),
          pis_pasep = COALESCE(NULLIF($5, ''), pis_pasep),
          mother_name = COALESCE(NULLIF($6, ''), mother_name),
          father_name = COALESCE(NULLIF($7, ''), father_name),
          updated_at = now()
        WHERE id = $1::uuid AND tenant_id = public.sgp_current_tenant_uuid()
        `,
        [
          employeeId,
          this.stringValue(payload.socialName),
          this.stringValue(payload.rg),
          this.stringValue(payload.rgIssuer),
          this.stringValue(payload.pisPasep),
          this.stringValue(payload.motherName),
          this.stringValue(payload.fatherName),
        ],
      );
    }
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toCadastralChange(row: CadastralChangeRow): Record<string, unknown> {
    return {
      id: row.id,
      employeeId: row.employee_id,
      registration: row.registration,
      employeeName: row.employee_name,
      section: row.section,
      status: row.status,
      previousPayload: row.previous_payload,
      requestedPayload: row.requested_payload,
      decisionNotes: row.decision_notes,
      requestedBySub: row.requested_by_sub,
      requestedByLogin: row.requested_by_login,
      decidedBySub: row.decided_by_sub,
      decidedByLogin: row.decided_by_login,
      requestedAt: this.toIso(row.requested_at),
      decidedAt: row.decided_at ? this.toIso(row.decided_at) : null,
    };
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
      abonoPermanenciaAtivo: row.abono_permanencia_ativo ?? false,
      abonoPermanenciaInicio: row.abono_permanencia_inicio
        ? this.toIso(row.abono_permanencia_inicio).slice(0, 10)
        : null,
      abonoPermanenciaFundamento: row.abono_permanencia_fundamento ?? null,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toAbonoPermanencia(
    row: AbonoPermanenciaRow,
  ): Record<string, unknown> {
    return {
      employeeId: row.id,
      active: row.active,
      startsOn: row.starts_on ? this.toIso(row.starts_on).slice(0, 10) : null,
      legalBasis: row.legal_basis,
      auditEventId: row.audit_event_id ?? null,
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
