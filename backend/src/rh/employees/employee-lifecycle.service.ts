import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { AdmitEmployeeDto, TerminateEmployeeDto } from './employees.dto';
import { toSummary } from './employee-mappers';
import { EmployeeReferenceDataService } from './employee-reference-data.service';
import {
  AdmitRow,
  EmployeeAdmissionResult,
  EmployeeListRow,
  EmployeeTerminationResult,
  PayrollRunRefRow,
} from './employees.types';

@Injectable()
export class EmployeeLifecycleService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly referenceDataService: EmployeeReferenceDataService,
  ) {}

  async admit(input: AdmitEmployeeDto): Promise<EmployeeAdmissionResult> {
    this.ensureDatabase();
    try {
      const row = await this.databaseService.transaction(async (client) => {
        const functionalStatusId =
          input.functionalStatusId ??
          (await this.referenceDataService.ensureFunctionalStatus(client, {
            code: 'EM_EXERCICIO',
            description: 'Em exercicio',
            modality: 'ATIVO',
            kind: 'EXERCICIO',
            entersPayroll: true,
            lifecycleStatus: 'ACTIVE',
          }));
        const employmentLinkId =
          input.employmentLinkId ??
          (await this.referenceDataService.ensureEmploymentLink(
            client,
            'ESTATUTARIO',
            'Estatutario',
          ));
        const contractTypeId =
          input.contractTypeId ??
          (await this.referenceDataService.ensureContractType(
            client,
            'EFETIVO',
            'Efetivo',
          ));

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
            e.version,
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
        employee: toSummary(row),
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

  async terminate(
    id: string,
    input: TerminateEmployeeDto,
  ): Promise<EmployeeTerminationResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const functionalStatusId =
        await this.referenceDataService.ensureFunctionalStatus(client, {
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
        const payrollTypeId =
          await this.referenceDataService.ensurePayrollType(client);
        const processingTypeId =
          await this.referenceDataService.ensureProcessingType(
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
        employee: toSummary(row),
        payrollRunId,
        payrollRunStatus,
      };
    });
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for employee operations',
      );
    }
  }
}
