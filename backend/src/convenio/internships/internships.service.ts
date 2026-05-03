import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  S2300Builder,
  S2300BuildResult,
} from '../../esocial-worker/builders/s2300.builder';
import {
  CreateInternshipDto,
  CreateInternshipProgramDto,
  ExtendInternshipDto,
  TerminateInternshipDto,
} from './internships.dto';

export interface InternshipProgramSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  institution: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
}

export interface InternshipSummary {
  id: string;
  programId: string | null;
  agreementId: string | null;
  employeeId: string | null;
  tsvContractId: string | null;
  internName: string;
  internCpf: string | null;
  supervisorName: string | null;
  startsOn: string;
  endsOn: string | null;
  status: string;
  termNumber: string;
  termSignedOn: string | null;
  activityPlanUri: string;
  activityPlanDescription: string;
  weeklyHours: string;
  stipendAmount: string | null;
  esocialStartEvent: {
    eventKind: 'S-2300';
    tsvContractId: string;
  } | null;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface ProgramRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string;
  institution_name: string | null;
  starts_on: Date | string | null;
  ends_on: Date | string | null;
  status: string;
}

interface InternshipRow extends QueryResultRow {
  id: string;
  program_id: string | null;
  agreement_id: string | null;
  employee_id: string | null;
  tsv_contract_id: string | null;
  intern_name: string;
  intern_cpf: string | null;
  supervisor_name: string | null;
  starts_on: Date | string;
  ends_on: Date | string | null;
  stipend_amount: string | null;
  status: string;
  term_number: string;
  term_signed_on: Date | string | null;
  activity_plan_uri: string;
  activity_plan_description: string;
  weekly_hours: string;
}

interface ProgramLookupRow extends QueryResultRow {
  id: string;
  institution_name: string | null;
}

@Injectable()
export class InternshipsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly s2300Builder: S2300Builder,
  ) {}

  async listPrograms(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<InternshipProgramSummary>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.internship_program p
      LEFT JOIN hr.education_institution i ON i.id = p.institution_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', p.code, p.name, p.description, coalesce(i.name, ''), p.status::text)) LIKE $1
      `,
      [searchTerm],
    );
    const rows = await this.databaseService.query<ProgramRow>(
      `
      SELECT
        p.id::text,
        p.code,
        p.name,
        p.description,
        i.name AS institution_name,
        p.starts_on,
        p.ends_on,
        p.status::text AS status
      FROM hr.internship_program p
      LEFT JOIN hr.education_institution i ON i.id = p.institution_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', p.code, p.name, p.description, coalesce(i.name, ''), p.status::text)) LIKE $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toProgramSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async createProgram(
    input: CreateInternshipProgramDto,
  ): Promise<InternshipProgramSummary> {
    this.ensureDatabase();
    this.assertDateRange(input.startsOn, input.endsOn, 'Program');
    try {
      const rows = await this.databaseService.query<ProgramRow>(
        `
        INSERT INTO hr.internship_program (
          code,
          name,
          description,
          institution_id,
          starts_on,
          ends_on
        )
        VALUES ($1, $2, $3, NULLIF($4, '')::uuid, NULLIF($5, '')::date, NULLIF($6, '')::date)
        RETURNING
          id::text,
          code,
          name,
          description,
          NULL::text AS institution_name,
          starts_on,
          ends_on,
          status::text AS status
        `,
        [
          input.code.trim(),
          input.name.trim(),
          input.description?.trim() ?? '',
          input.institutionId ?? '',
          input.startsOn ?? '',
          input.endsOn ?? '',
        ],
      );
      return this.toProgramSummary(rows[0]!);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Internship program code already exists');
      }
      throw error;
    }
  }

  async listInternships(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<InternshipSummary>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;
    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.internship_record r
      LEFT JOIN hr.internship_program p ON p.id = r.program_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', r.intern_name, coalesce(r.intern_cpf, ''), coalesce(p.name, ''), r.term_number, r.status::text)) LIKE $1
      `,
      [searchTerm],
    );
    const rows = await this.databaseService.query<InternshipRow>(
      `
      SELECT
        r.id::text,
        r.program_id::text,
        r.agreement_id::text,
        r.employee_id::text,
        r.tsv_contract_id::text,
        r.intern_name,
        r.intern_cpf,
        r.supervisor_name,
        r.starts_on,
        r.ends_on,
        r.stipend_amount::text,
        r.status::text AS status,
        r.term_number,
        r.term_signed_on,
        r.activity_plan_uri,
        r.activity_plan_description,
        r.weekly_hours::text
      FROM hr.internship_record r
      LEFT JOIN hr.internship_program p ON p.id = r.program_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ', r.intern_name, coalesce(r.intern_cpf, ''), coalesce(p.name, ''), r.term_number, r.status::text)) LIKE $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toInternshipSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async createInternship(
    input: CreateInternshipDto,
  ): Promise<InternshipSummary> {
    this.ensureDatabase();
    this.assertInternshipDates(input.startsOn, input.endsOn);
    this.assertWeeklyHours(input.weeklyHours);
    const tenantId = this.currentTenantId();

    return this.runWithOperationalPermissions(tenantId, () =>
      this.databaseService.transaction(async (client) => {
        const program = await this.loadProgram(
          client,
          tenantId,
          input.programId,
        );
        if (!program)
          throw new NotFoundException('Internship program not found');
        const employmentLinkId =
          input.employmentLinkId ??
          (await this.createEmploymentLink(client, tenantId, input));
        const employeeId =
          input.employeeId ??
          (await this.createEmployee(
            client,
            tenantId,
            employmentLinkId,
            input,
          ));
        const tsvContractId = await this.createTsvContract(
          client,
          tenantId,
          employmentLinkId,
          program.institution_name,
          input,
        );
        const row = await this.insertInternshipRecord(
          client,
          tenantId,
          employeeId,
          tsvContractId,
          input,
        );
        return this.toInternshipSummary(row);
      }),
    );
  }

  async extendInternship(
    id: string,
    input: ExtendInternshipDto,
  ): Promise<InternshipSummary> {
    this.ensureDatabase();
    const current = await this.loadInternship(id);
    if (!current) throw new NotFoundException('Internship not found');
    this.assertInternshipDates(
      this.toDateOnly(current.starts_on),
      input.endsOn,
    );

    const rows = await this.runWithOperationalPermissions(
      this.currentTenantId(),
      () =>
        this.databaseService.query<InternshipRow>(
          `
      WITH updated AS (
        UPDATE hr.internship_record
        SET ends_on = $2::date,
            status = 'ACTIVE'::"AgreementStatus",
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING *
      ), tsv AS (
        UPDATE hr.tsv_contract tc
        SET end_date = $2::date,
            updated_at = now()
        FROM updated
        WHERE tc.id = updated.tsv_contract_id
        RETURNING tc.id
      )
      SELECT
        updated.id::text,
        updated.program_id::text,
        updated.agreement_id::text,
        updated.employee_id::text,
        updated.tsv_contract_id::text,
        updated.intern_name,
        updated.intern_cpf,
        updated.supervisor_name,
        updated.starts_on,
        updated.ends_on,
        updated.stipend_amount::text,
        updated.status::text AS status,
        updated.term_number,
        updated.term_signed_on,
        updated.activity_plan_uri,
        updated.activity_plan_description,
        updated.weekly_hours::text
      FROM updated
      `,
          [id, input.endsOn],
        ),
    );
    return this.toInternshipSummary(rows[0]!);
  }

  async terminateInternship(
    id: string,
    input: TerminateInternshipDto,
  ): Promise<InternshipSummary> {
    this.ensureDatabase();
    const current = await this.loadInternship(id);
    if (!current) throw new NotFoundException('Internship not found');
    this.assertDateRange(
      this.toDateOnly(current.starts_on),
      input.terminationDate,
      'Internship',
    );

    const rows = await this.runWithOperationalPermissions(
      this.currentTenantId(),
      () =>
        this.databaseService.query<InternshipRow>(
          `
      WITH updated AS (
        UPDATE hr.internship_record
        SET ends_on = $2::date,
            status = 'TERMINATED'::"AgreementStatus",
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING *
      ), tsv AS (
        UPDATE hr.tsv_contract tc
        SET end_date = $2::date,
            updated_at = now()
        FROM updated
        WHERE tc.id = updated.tsv_contract_id
        RETURNING tc.id
      ), employee_update AS (
        UPDATE hr.employee e
        SET terminated_on = $2::date,
            lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
            updated_at = now()
        FROM updated
        WHERE e.id = updated.employee_id
        RETURNING e.id
      )
      SELECT
        updated.id::text,
        updated.program_id::text,
        updated.agreement_id::text,
        updated.employee_id::text,
        updated.tsv_contract_id::text,
        updated.intern_name,
        updated.intern_cpf,
        updated.supervisor_name,
        updated.starts_on,
        updated.ends_on,
        updated.stipend_amount::text,
        updated.status::text AS status,
        updated.term_number,
        updated.term_signed_on,
        updated.activity_plan_uri,
        updated.activity_plan_description,
        updated.weekly_hours::text
      FROM updated
      `,
          [id, input.terminationDate],
        ),
    );
    return this.toInternshipSummary(rows[0]!);
  }

  async buildS2300(id: string): Promise<S2300BuildResult> {
    this.ensureDatabase();
    const current = await this.loadInternship(id);
    if (!current?.tsv_contract_id) {
      throw new NotFoundException('Internship S-2300 source not found');
    }
    const tsvContractId = current.tsv_contract_id;
    return this.runWithOperationalPermissions(this.currentTenantId(), () =>
      this.s2300Builder.build(tsvContractId),
    );
  }

  private async loadProgram(
    client: PoolClient,
    tenantId: string,
    programId: string,
  ): Promise<ProgramLookupRow | null> {
    const result = await client.query<ProgramLookupRow>(
      `
      SELECT p.id::text, i.name AS institution_name
      FROM hr.internship_program p
      LEFT JOIN hr.education_institution i ON i.id = p.institution_id
      WHERE p.tenant_id = $1::uuid
        AND p.id = $2::uuid
      `,
      [tenantId, programId],
    );
    return result.rows[0] ?? null;
  }

  private async createEmploymentLink(
    client: PoolClient,
    tenantId: string,
    input: CreateInternshipDto,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO hr.employment_link (
        tenant_id,
        code,
        name,
        contract_type,
        end_date,
        regime_law_reference
      )
      VALUES ($1::uuid, $2, $3, 'temporary', $4::date, 'Lei 11.788/2008')
      RETURNING id::text
      `,
      [
        tenantId,
        `EST-${input.registration.trim()}`.slice(0, 80),
        `Estagio - ${input.internName.trim()}`.slice(0, 200),
        input.endsOn,
      ],
    );
    return result.rows[0]!.id;
  }

  private async createEmployee(
    client: PoolClient,
    tenantId: string,
    employmentLinkId: string,
    input: CreateInternshipDto,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO hr.employee (
        tenant_id,
        registration,
        name,
        cpf,
        birth_date,
        gender,
        email,
        phone,
        work_location_id,
        employment_link_id,
        hired_on,
        lifecycle_status,
        education_level,
        address
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        NULLIF($5, '')::date,
        $6::"PersonGender",
        NULLIF($7, ''),
        NULLIF($8, ''),
        $9::uuid,
        $10::uuid,
        $11::date,
        'INTERN'::"EmployeeLifecycleStatus",
        NULLIF($12, ''),
        '{}'::jsonb
      )
      RETURNING id::text
      `,
      [
        tenantId,
        input.registration.trim(),
        input.internName.trim(),
        input.internCpf.trim(),
        input.birthDate ?? '',
        input.gender ?? 'UNDECLARED',
        input.email ?? '',
        input.phone ?? '',
        input.workplaceId,
        employmentLinkId,
        input.startsOn,
        input.educationLevel ?? '',
      ],
    );
    return result.rows[0]!.id;
  }

  private async createTsvContract(
    client: PoolClient,
    tenantId: string,
    employmentLinkId: string,
    programInstitutionName: string | null,
    input: CreateInternshipDto,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `
      INSERT INTO hr.tsv_contract (
        tenant_id,
        employment_link_id,
        tsv_category,
        start_date,
        end_date,
        role,
        monthly_amount,
        weekly_hours,
        workplace_id,
        supervisor_employee_id,
        education_institution,
        internship_plan_uri
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        '901',
        $3::date,
        $4::date,
        $5,
        COALESCE(NULLIF($6, '')::numeric(14,2), 0),
        $7::numeric(18,6),
        $8::uuid,
        NULLIF($9, '')::uuid,
        $10,
        $11
      )
      RETURNING id::text
      `,
      [
        tenantId,
        employmentLinkId,
        input.startsOn,
        input.endsOn,
        input.role.trim(),
        input.stipendAmount ?? '',
        input.weeklyHours,
        input.workplaceId,
        input.supervisorEmployeeId ?? '',
        programInstitutionName ?? 'Instituicao de Ensino',
        input.activityPlanUri.trim(),
      ],
    );
    return result.rows[0]!.id;
  }

  private async insertInternshipRecord(
    client: PoolClient,
    tenantId: string,
    employeeId: string,
    tsvContractId: string,
    input: CreateInternshipDto,
  ): Promise<InternshipRow> {
    const result = await client.query<InternshipRow>(
      `
      INSERT INTO hr.internship_record (
        tenant_id,
        agreement_id,
        program_id,
        employee_id,
        tsv_contract_id,
        intern_name,
        intern_cpf,
        supervisor_name,
        supervisor_employee_id,
        starts_on,
        ends_on,
        stipend_amount,
        term_number,
        term_signed_on,
        activity_plan_uri,
        activity_plan_description,
        role,
        weekly_hours,
        course_name,
        education_level,
        insurance_policy
      )
      VALUES (
        $1::uuid,
        NULLIF($2, '')::uuid,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6,
        $7,
        $8,
        NULLIF($9, '')::uuid,
        $10::date,
        $11::date,
        NULLIF($12, '')::numeric(14,2),
        $13,
        $14::date,
        $15,
        $16,
        $17,
        $18::numeric(18,6),
        NULLIF($19, ''),
        NULLIF($20, ''),
        NULLIF($21, '')
      )
      RETURNING
        id::text,
        program_id::text,
        agreement_id::text,
        employee_id::text,
        tsv_contract_id::text,
        intern_name,
        intern_cpf,
        supervisor_name,
        starts_on,
        ends_on,
        stipend_amount::text,
        status::text AS status,
        term_number,
        term_signed_on,
        activity_plan_uri,
        activity_plan_description,
        weekly_hours::text
      `,
      [
        tenantId,
        input.agreementId ?? '',
        input.programId,
        employeeId,
        tsvContractId,
        input.internName.trim(),
        input.internCpf.trim(),
        input.supervisorName.trim(),
        input.supervisorEmployeeId ?? '',
        input.startsOn,
        input.endsOn,
        input.stipendAmount ?? '',
        input.termNumber.trim(),
        input.termSignedOn,
        input.activityPlanUri.trim(),
        input.activityPlanDescription.trim(),
        input.role.trim(),
        input.weeklyHours,
        input.courseName ?? '',
        input.educationLevel ?? '',
        input.insurancePolicy ?? '',
      ],
    );
    return result.rows[0]!;
  }

  private async loadInternship(id: string): Promise<InternshipRow | null> {
    const rows = await this.databaseService.query<InternshipRow>(
      `
      SELECT
        id::text,
        program_id::text,
        agreement_id::text,
        employee_id::text,
        tsv_contract_id::text,
        intern_name,
        intern_cpf,
        supervisor_name,
        starts_on,
        ends_on,
        stipend_amount::text,
        status::text AS status,
        term_number,
        term_signed_on,
        activity_plan_uri,
        activity_plan_description,
        weekly_hours::text
      FROM hr.internship_record
      WHERE id = $1::uuid
      `,
      [id],
    );
    return rows[0] ?? null;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for internship operations',
      );
    }
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) throw new Error('Tenant context is required');
    return tenantId;
  }

  private runWithOperationalPermissions<T>(
    tenantId: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const context = RequestContextStore.get();
    const permissions = new Set([
      ...(context?.actor?.permissions ?? context?.permissions ?? []),
      'convenio.write',
      'rh.employee.write',
      'rh.employee.terminate',
      'hr.employment.read',
      'hr.employment.write',
      'esocial.event.read',
      'esocial.event.write',
      'gestao.write',
    ]);
    return RequestContextStore.run(
      {
        ...context,
        tenantId,
        permissions: [...permissions],
        actor: context?.actor
          ? { ...context.actor, permissions: [...permissions] }
          : context?.actor,
      },
      callback,
    );
  }

  private assertInternshipDates(startsOn: string, endsOn: string): void {
    this.assertDateRange(startsOn, endsOn, 'Internship');
    const start = parseDate(startsOn);
    const end = parseDate(endsOn);
    const max = new Date(start);
    max.setUTCMonth(max.getUTCMonth() + 24);
    if (end > max) {
      throw new BadRequestException(
        'Internship duration cannot exceed 24 months',
      );
    }
  }

  private assertDateRange(
    startsOn: string | undefined,
    endsOn: string | undefined,
    label: string,
  ): void {
    if (!startsOn || !endsOn) return;
    if (parseDate(endsOn) < parseDate(startsOn)) {
      throw new BadRequestException(
        `${label} end date cannot be before start date`,
      );
    }
  }

  private assertWeeklyHours(value: string): void {
    const hours = Number(value.replace(',', '.'));
    if (!Number.isFinite(hours) || hours <= 0 || hours > 30) {
      throw new BadRequestException(
        'Ordinary internship weeklyHours must be greater than 0 and at most 30',
      );
    }
  }

  private toProgramSummary(row: ProgramRow): InternshipProgramSummary {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      institution: row.institution_name,
      startsOn: row.starts_on ? this.toDateOnly(row.starts_on) : null,
      endsOn: row.ends_on ? this.toDateOnly(row.ends_on) : null,
      status: row.status,
    };
  }

  private toInternshipSummary(row: InternshipRow): InternshipSummary {
    return {
      id: row.id,
      programId: row.program_id,
      agreementId: row.agreement_id,
      employeeId: row.employee_id,
      tsvContractId: row.tsv_contract_id,
      internName: row.intern_name,
      internCpf: row.intern_cpf,
      supervisorName: row.supervisor_name,
      startsOn: this.toDateOnly(row.starts_on),
      endsOn: row.ends_on ? this.toDateOnly(row.ends_on) : null,
      status: row.status,
      termNumber: row.term_number,
      termSignedOn: row.term_signed_on
        ? this.toDateOnly(row.term_signed_on)
        : null,
      activityPlanUri: row.activity_plan_uri,
      activityPlanDescription: row.activity_plan_description,
      weeklyHours: normalizeDecimal(row.weekly_hours, 6),
      stipendAmount:
        row.stipend_amount === null
          ? null
          : normalizeDecimal(row.stipend_amount, 2),
      esocialStartEvent: row.tsv_contract_id
        ? { eventKind: 'S-2300', tsvContractId: row.tsv_contract_id }
        : null,
    };
  }

  private toDateOnly(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString().slice(0, 10)
      : new Date(value).toISOString().slice(0, 10);
  }
}

function parseDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  return parsed;
}

function normalizeDecimal(value: string, scale: number): string {
  const numeric = Number(value.replace(',', '.'));
  if (!Number.isFinite(numeric)) return Number(0).toFixed(scale);
  return numeric.toFixed(scale);
}
