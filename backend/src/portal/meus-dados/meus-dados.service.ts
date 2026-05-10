import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { CareerPlanService } from '../../avaliacao/career-plan/career-plan.service';
import { EligibilityService } from '../../avaliacao/progression/progression.service';
import { AuthenticatedActor } from '../../auth/actor.types';
import { DatabaseService } from '../../database/database.service';

export interface EmployeeProfileRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  social_name: string | null;
  cpf: string | null;
  birth_date: Date | string | null;
  email: string | null;
  phone: string | null;
  branch_id: string | null;
  work_location_id: string | null;
  cost_center_id: string | null;
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
export class MeusDadosService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly careerPlanService: CareerPlanService,
    private readonly eligibilityService: EligibilityService,
  ) {}

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
    const employee = await this.loadEmployee(actor);
    const trail = (await this.careerPlanService.trailForActor(actor)) as Record<
      string,
      unknown
    >;
    const history = await this.databaseService.query<QueryResultRow>(
      `
      WITH current_level AS (
        SELECT srl.id
        FROM hr.employee e
        JOIN hr.job_position jp ON jp.id = e.job_position_id
        JOIN hr.salary_range_level srl ON srl.salary_range_id = jp.salary_range_id
        WHERE e.id = $1::uuid
        ORDER BY srl.class_number, srl.level_number_fol02
        LIMIT 1
      )
      SELECT
        history.vigencia_inicio AS "vigenciaInicio",
        history.vigencia_fim AS "vigenciaFim",
        history.vencimento_basico::text AS "vencimentoBasico",
        history.motivo,
        history.lei_referencia AS "leiReferencia"
      FROM hr.salary_level_history history
      JOIN current_level ON current_level.id = history.salary_range_level_id
      ORDER BY history.vigencia_inicio DESC
      `,
      [employee.id],
    );
    let nextProgression: unknown = null;
    try {
      nextProgression = await this.eligibilityService.checkInterstice(
        employee.id,
      );
    } catch {
      nextProgression = null;
    }
    return { ...trail, salaryHistory: history, nextProgression };
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
      id: rows[0]!.id,
      status: 'PENDING',
      section,
      requestedPayload: payload,
      previousPayload: previous,
    };
  }

  async loadEmployee(
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
        branch_id::text,
        work_location_id::text,
        cost_center_id::text,
        pis_pasep,
        rg,
        rg_issuer,
        mother_name,
        father_name,
        address
      FROM hr.v_employee_pii_decrypted
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

  toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  toDate(value: Date | string): string {
    return this.toIso(value).slice(0, 10);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for portal operations',
      );
    }
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
}
