import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { RhRequestDto, RhWorkflowMutationDto } from './rh-workflows.dto';

interface CountRow extends QueryResultRow {
  total: string;
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface WorkflowRow extends QueryResultRow {
  id: string;
  employee_id: string | null;
  employee_registration: string | null;
  employee_name: string | null;
  title: string;
  subtitle: string;
  starts_on: Date | string | null;
  ends_on: Date | string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LookupRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  metadata: Record<string, unknown> | null;
}

interface RequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

interface WorkflowDefinition {
  key: string;
  label: string;
  legacyRoute: string;
  table: string;
  employeeScoped: boolean;
  select: string;
  from: string;
  search: string;
  orderBy: string;
  activeDelete?: string;
}

const WORKFLOWS: WorkflowDefinition[] = [
  workflow({
    key: 'dependents',
    label: 'Dependentes',
    legacyRoute: '#!/dependente/gestao',
    table: 'employee_dependent',
    employeeScoped: true,
    select:
      "d.id::text, d.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, d.name AS title, d.relationship AS subtitle, NULL::date AS starts_on, NULL::date AS ends_on, 'ACTIVE' AS status, jsonb_build_object('cpf', d.cpf, 'birthDate', d.birth_date, 'incomeTaxDependent', d.income_tax_dependent) AS metadata, d.created_at, d.updated_at",
    from: 'hr.employee_dependent d JOIN hr.employee e ON e.id = d.employee_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, d.name, d.cpf, d.relationship))",
    orderBy: 'e.registration ASC, d.name ASC',
  }),
  workflow({
    key: 'professional-experiences',
    label: 'Experiencia Profissional',
    legacyRoute: '#!/experienciaProfissional/gestao',
    table: 'professional_experience',
    employeeScoped: true,
    select:
      "p.id::text, p.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, p.employer AS title, coalesce(p.role_title, '') AS subtitle, p.starts_on, p.ends_on, 'ACTIVE' AS status, jsonb_build_object('description', p.description) AS metadata, p.created_at, p.updated_at",
    from: 'hr.professional_experience p JOIN hr.employee e ON e.id = p.employee_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, p.employer, p.role_title, p.description))",
    orderBy: 'e.registration ASC, p.starts_on DESC NULLS LAST, p.employer ASC',
  }),
  workflow({
    key: 'status-history',
    label: 'Afastamentos dos Funcionarios',
    legacyRoute: '#!/historicoSituacaoFuncional/gestao',
    table: 'employee_status_history',
    employeeScoped: true,
    select:
      "h.id::text, h.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, fs.description AS title, coalesce(r.description, '') AS subtitle, h.starts_on, h.ends_on, 'ACTIVE' AS status, jsonb_build_object('functionalStatusId', h.functional_status_id, 'reasonId', h.reason_id, 'notes', h.notes) AS metadata, h.created_at, h.created_at AS updated_at",
    from: 'hr.employee_status_history h JOIN hr.employee e ON e.id = h.employee_id JOIN hr.functional_status fs ON fs.id = h.functional_status_id LEFT JOIN hr.reason r ON r.id = h.reason_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, fs.description, r.description, h.notes))",
    orderBy: 'e.registration ASC, h.starts_on DESC',
  }),
  workflow({
    key: 'frequencies',
    label: 'Frequencias',
    legacyRoute: '#!/frequencia/gestao',
    table: 'employee_frequency',
    employeeScoped: true,
    select:
      "f.id::text, f.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, concat(f.year, '/', coalesce(lpad(f.month::text, 2, '0'), '--')) AS title, concat('Faltas: ', f.absence_days, ' / Trabalhados: ', coalesce(f.worked_days::text, '')) AS subtitle, NULL::date AS starts_on, NULL::date AS ends_on, 'ACTIVE' AS status, jsonb_build_object('year', f.year, 'month', f.month, 'absenceDays', f.absence_days, 'workedDays', f.worked_days, 'notes', f.notes) AS metadata, f.created_at, f.updated_at",
    from: 'hr.employee_frequency f JOIN hr.employee e ON e.id = f.employee_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, f.year::text, f.month::text, f.notes))",
    orderBy: 'e.registration ASC, f.year DESC, f.month DESC NULLS LAST',
  }),
  workflow({
    key: 'service-time',
    label: 'Tempo de Servico',
    legacyRoute: '#!/tempoServico/gestao',
    table: 'service_time_record',
    employeeScoped: true,
    select:
      "s.id::text, s.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, s.source AS title, coalesce(s.days_count::text, '') AS subtitle, s.starts_on, s.ends_on, 'ACTIVE' AS status, jsonb_build_object('daysCount', s.days_count, 'notes', s.notes) AS metadata, s.created_at, s.updated_at",
    from: 'hr.service_time_record s JOIN hr.employee e ON e.id = s.employee_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, s.source, s.notes))",
    orderBy: 'e.registration ASC, s.starts_on DESC',
  }),
  workflow({
    key: 'transfers',
    label: 'Transferencia de Funcionarios',
    legacyRoute: '#!/transferenciaFuncionario/gestao',
    table: 'employee_transfer',
    employeeScoped: true,
    select:
      "t.id::text, t.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, coalesce(tb.name, 'Transferencia') AS title, coalesce(wl.name, '') AS subtitle, t.effective_on AS starts_on, NULL::date AS ends_on, 'ACTIVE' AS status, jsonb_build_object('fromBranchId', t.from_branch_id, 'toBranchId', t.to_branch_id, 'toWorkLocationId', t.to_work_location_id, 'reasonId', t.reason_id, 'notes', t.notes) AS metadata, t.created_at, t.created_at AS updated_at",
    from: 'hr.employee_transfer t JOIN hr.employee e ON e.id = t.employee_id LEFT JOIN hr.branch fb ON fb.id = t.from_branch_id LEFT JOIN hr.branch tb ON tb.id = t.to_branch_id LEFT JOIN hr.work_location wl ON wl.id = t.to_work_location_id LEFT JOIN hr.reason r ON r.id = t.reason_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, fb.name, tb.name, wl.name, r.description, t.notes))",
    orderBy: 'e.registration ASC, t.effective_on DESC',
  }),
  workflow({
    key: 'salary-history',
    label: 'Historico Nivel Salarial',
    legacyRoute: '#!/nivelSalarialHistorico/gestao',
    table: 'salary_level_history',
    employeeScoped: true,
    select:
      "sl.id::text, sl.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, coalesce(sl.level_description, sr.description, sl.level_code, 'Ajuste salarial') AS title, sl.adjustment_amount::text AS subtitle, sl.effective_on AS starts_on, NULL::date AS ends_on, 'ACTIVE' AS status, jsonb_build_object('salaryReferenceId', sl.salary_reference_id, 'levelCode', sl.level_code, 'adjustmentAmount', sl.adjustment_amount) AS metadata, sl.created_at, sl.created_at AS updated_at",
    from: 'hr.salary_level_history sl JOIN hr.employee e ON e.id = sl.employee_id LEFT JOIN hr.salary_reference sr ON sr.id = sl.salary_reference_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, sl.level_code, sl.level_description, sr.description))",
    orderBy: 'e.registration ASC, sl.effective_on DESC',
  }),
  workflow({
    key: 'complement-data',
    label: 'Dados Cadastrais Complementares',
    legacyRoute: '#!/dadoCadastralComplementar/gestao',
    table: 'employee_complement_data',
    employeeScoped: true,
    select:
      "c.id::text, c.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, coalesce(c.rg, e.name) AS title, coalesce(c.pis_pasep, '') AS subtitle, NULL::date AS starts_on, NULL::date AS ends_on, 'ACTIVE' AS status, jsonb_build_object('rg', c.rg, 'rgIssuer', c.rg_issuer, 'pisPasep', c.pis_pasep, 'voterRegistration', c.voter_registration, 'address', c.address, 'emergencyContact', c.emergency_contact) AS metadata, c.created_at, c.updated_at",
    from: 'hr.employee_complement_data c JOIN hr.employee e ON e.id = c.employee_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, c.rg, c.pis_pasep, c.voter_registration))",
    orderBy: 'e.registration ASC',
  }),
  workflow({
    key: 'vacations',
    label: 'Programacao de Ferias',
    legacyRoute: '#!/feriasProgramacao/gestao',
    table: 'vacation_record',
    employeeScoped: true,
    select:
      "v.id::text, v.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, coalesce(vt.description, 'Ferias') AS title, concat(v.days, ' dias') AS subtitle, v.starts_on, v.ends_on, v.status::text AS status, jsonb_build_object('vacationTypeId', v.vacation_type_id, 'accrualStartOn', v.accrual_start_on, 'accrualEndOn', v.accrual_end_on, 'days', v.days) AS metadata, v.created_at, v.updated_at",
    from: 'hr.vacation_record v JOIN hr.employee e ON e.id = v.employee_id LEFT JOIN hr.vacation_type vt ON vt.id = v.vacation_type_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, vt.description, v.status::text))",
    orderBy: 'e.registration ASC, v.starts_on DESC',
    activeDelete: "status = 'cancelado', updated_at = now()",
  }),
  workflow({
    key: 'leaves',
    label: 'Licenca Premio',
    legacyRoute: '#!/licencaPremio/gestao',
    table: 'leave_record',
    employeeScoped: true,
    select:
      "l.id::text, l.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, coalesce(ar.description, 'Licenca') AS title, coalesce(l.notes, '') AS subtitle, l.starts_on, l.ends_on, l.status::text AS status, jsonb_build_object('absenceReasonId', l.absence_reason_id, 'days', l.days, 'notes', l.notes) AS metadata, l.created_at, l.updated_at",
    from: 'hr.leave_record l JOIN hr.employee e ON e.id = l.employee_id LEFT JOIN hr.absence_reason ar ON ar.id = l.absence_reason_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, ar.description, l.notes, l.status::text))",
    orderBy: 'e.registration ASC, l.starts_on DESC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'benefit-dependents',
    label: 'Dependentes de Beneficio',
    legacyRoute: '#!/dependenteBeneficio/gestao',
    table: 'employee_benefit_dependent',
    employeeScoped: true,
    select:
      "bd.id::text, bd.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, bd.dependent_name AS title, bd.benefit_code AS subtitle, bd.starts_on, bd.ends_on, bd.status::text AS status, jsonb_build_object('dependentId', bd.dependent_id, 'dependentCpf', bd.dependent_cpf, 'relationship', bd.relationship, 'notes', bd.notes) AS metadata, bd.created_at, bd.updated_at",
    from: 'hr.employee_benefit_dependent bd JOIN hr.employee e ON e.id = bd.employee_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, bd.dependent_name, bd.dependent_cpf, bd.relationship, bd.benefit_code, bd.notes))",
    orderBy: 'e.registration ASC, bd.starts_on DESC, bd.dependent_name ASC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'union-contributions',
    label: 'Contribuicoes Sindicais',
    legacyRoute: '#!/contribuicaoSindical/gestao',
    table: 'employee_union_contribution',
    employeeScoped: true,
    select:
      "uc.id::text, uc.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, coalesce(u.description, 'Contribuicao sindical') AS title, coalesce(uc.deduction_amount::text, uc.deduction_percent::text, '') AS subtitle, uc.starts_on, uc.ends_on, uc.status::text AS status, jsonb_build_object('unionId', uc.union_id, 'deductionAmount', uc.deduction_amount, 'deductionPercent', uc.deduction_percent, 'notes', uc.notes) AS metadata, uc.created_at, uc.updated_at",
    from: 'hr.employee_union_contribution uc JOIN hr.employee e ON e.id = uc.employee_id LEFT JOIN hr.union_entity u ON u.id = uc.union_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, u.description, uc.deduction_amount::text, uc.deduction_percent::text, uc.notes))",
    orderBy: 'e.registration ASC, uc.starts_on DESC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'exercises',
    label: 'Exercicio dos Funcionarios',
    legacyRoute: '#!/exercicioFuncionario/gestao',
    table: 'employee_exercise',
    employeeScoped: true,
    select:
      "ex.id::text, ex.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, coalesce(jf.name, 'Exercicio') AS title, coalesce(wl.name, b.name, '') AS subtitle, ex.starts_on, ex.ends_on, ex.status::text AS status, jsonb_build_object('branchId', ex.branch_id, 'workLocationId', ex.work_location_id, 'jobFunctionId', ex.job_function_id, 'notes', ex.notes) AS metadata, ex.created_at, ex.updated_at",
    from: 'hr.employee_exercise ex JOIN hr.employee e ON e.id = ex.employee_id LEFT JOIN hr.branch b ON b.id = ex.branch_id LEFT JOIN hr.work_location wl ON wl.id = ex.work_location_id LEFT JOIN hr.job_function jf ON jf.id = ex.job_function_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, jf.name, b.name, wl.name, ex.notes))",
    orderBy: 'e.registration ASC, ex.starts_on DESC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'alimonies',
    label: 'Pensoes Alimenticias',
    legacyRoute: '#!/pensaoAlimenticia/gestao',
    table: 'employee_alimony',
    employeeScoped: true,
    select:
      "pa.id::text, pa.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, pa.beneficiary_name AS title, pa.amount::text AS subtitle, pa.starts_on, pa.ends_on, pa.status::text AS status, jsonb_build_object('beneficiaryCpf', pa.beneficiary_cpf, 'courtProcessNumber', pa.court_process_number, 'notes', pa.notes) AS metadata, pa.created_at, pa.updated_at",
    from: 'hr.employee_alimony pa JOIN hr.employee e ON e.id = pa.employee_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, pa.beneficiary_name, pa.beneficiary_cpf, pa.court_process_number, pa.amount::text, pa.notes))",
    orderBy: 'e.registration ASC, pa.starts_on DESC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'transit-benefits',
    label: 'Vales Transporte',
    legacyRoute: '#!/valeTransporte/gestao',
    table: 'employee_transit_benefit',
    employeeScoped: true,
    select:
      "vt.id::text, vt.employee_id::text, e.registration AS employee_registration, e.name AS employee_name, tb.description AS title, vt.quantity::text AS subtitle, vt.starts_on, vt.ends_on, vt.status::text AS status, jsonb_build_object('transitBenefitId', vt.transit_benefit_id, 'unitAmount', tb.unit_amount, 'notes', vt.notes) AS metadata, vt.created_at, vt.updated_at",
    from: 'hr.employee_transit_benefit vt JOIN hr.employee e ON e.id = vt.employee_id JOIN hr.transit_benefit tb ON tb.id = vt.transit_benefit_id',
    search:
      "lower(concat_ws(' ', e.registration, e.name, e.cpf, tb.code, tb.description, vt.quantity::text, vt.notes))",
    orderBy: 'e.registration ASC, vt.starts_on DESC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'processes',
    label: 'Processos',
    legacyRoute: '#!/processo/gestao',
    table: 'administrative_process',
    employeeScoped: false,
    select:
      "ap.id::text, NULL::text AS employee_id, NULL::text AS employee_registration, NULL::text AS employee_name, ap.process_number AS title, ap.subject AS subtitle, ap.filed_on AS starts_on, ap.closed_on AS ends_on, ap.status::text AS status, jsonb_build_object('processNumber', ap.process_number, 'subject', ap.subject, 'notes', ap.notes) AS metadata, ap.created_at, ap.updated_at",
    from: 'hr.administrative_process ap',
    search: "lower(concat_ws(' ', ap.process_number, ap.subject, ap.notes))",
    orderBy: 'ap.filed_on DESC, ap.process_number ASC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'process-functions',
    label: 'Processo Funcao',
    legacyRoute: '#!/processoFuncao/gestao',
    table: 'administrative_process_function',
    employeeScoped: false,
    select:
      "pf.id::text, NULL::text AS employee_id, NULL::text AS employee_registration, NULL::text AS employee_name, jf.name AS title, ap.process_number AS subtitle, pf.assigned_on AS starts_on, pf.released_on AS ends_on, pf.status::text AS status, jsonb_build_object('processId', pf.process_id, 'jobFunctionId', pf.job_function_id, 'branchId', pf.branch_id, 'workLocationId', pf.work_location_id, 'notes', pf.notes) AS metadata, pf.created_at, pf.updated_at",
    from: 'hr.administrative_process_function pf JOIN hr.administrative_process ap ON ap.id = pf.process_id JOIN hr.job_function jf ON jf.id = pf.job_function_id LEFT JOIN hr.branch b ON b.id = pf.branch_id LEFT JOIN hr.work_location wl ON wl.id = pf.work_location_id',
    search:
      "lower(concat_ws(' ', ap.process_number, ap.subject, jf.name, b.name, wl.name, pf.notes))",
    orderBy: 'ap.process_number ASC, pf.assigned_on DESC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
  workflow({
    key: 'organic-definitions',
    label: 'Definicao de Organico',
    legacyRoute: '#!/definicaoOrganico/gestao',
    table: 'work_location',
    employeeScoped: false,
    select:
      "wl.id::text, NULL::text AS employee_id, NULL::text AS employee_registration, NULL::text AS employee_name, wl.name AS title, coalesce(b.name, '') AS subtitle, NULL::date AS starts_on, NULL::date AS ends_on, wl.status::text AS status, jsonb_build_object('code', wl.code, 'branchId', wl.branch_id, 'parentId', wl.parent_id, 'description', wl.description) AS metadata, wl.created_at, wl.updated_at",
    from: 'hr.work_location wl LEFT JOIN hr.branch b ON b.id = wl.branch_id',
    search: "lower(concat_ws(' ', wl.code, wl.name, wl.description, b.name))",
    orderBy: 'wl.code ASC, wl.name ASC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
];

const LOOKUPS: Record<string, { table: string; name: string; search: string }> =
  {
    branches: {
      table: 'hr.branch',
      name: 'name',
      search: "lower(concat_ws(' ', code, acronym, name))",
    },
    workLocations: {
      table: 'hr.work_location',
      name: 'name',
      search: "lower(concat_ws(' ', code, name, description))",
    },
    costCenters: {
      table: 'hr.cost_center',
      name: 'name',
      search: "lower(concat_ws(' ', code, name))",
    },
    jobPositions: {
      table: 'hr.job_position',
      name: 'name',
      search: "lower(concat_ws(' ', code, name, description))",
    },
    jobFunctions: {
      table: 'hr.job_function',
      name: 'name',
      search: "lower(concat_ws(' ', code, name, description))",
    },
    salaryReferences: {
      table: 'hr.salary_reference',
      name: 'description',
      search: "lower(concat_ws(' ', code, description))",
    },
    functionalStatuses: {
      table: 'hr.functional_status',
      name: 'description',
      search: "lower(concat_ws(' ', code, description, modality, kind))",
    },
    employmentLinks: {
      table: 'hr.employment_link',
      name: 'name',
      search: "lower(concat_ws(' ', code, name))",
    },
    contractTypes: {
      table: 'hr.contract_type',
      name: 'name',
      search: "lower(concat_ws(' ', code, name))",
    },
    shifts: {
      table: 'hr.shift',
      name: 'description',
      search: "lower(concat_ws(' ', code, description, schedule))",
    },
    unions: {
      table: 'hr.union_entity',
      name: 'description',
      search: "lower(concat_ws(' ', code, description, cnpj))",
    },
    banks: {
      table: 'hr.bank',
      name: 'name',
      search: "lower(concat_ws(' ', code, name, agency_digit))",
    },
    transitBenefits: {
      table: 'hr.transit_benefit',
      name: 'description',
      search: "lower(concat_ws(' ', code, description))",
    },
    absenceReasons: {
      table: 'hr.absence_reason',
      name: 'description',
      search: "lower(concat_ws(' ', code, description))",
    },
    reasons: {
      table: 'hr.reason',
      name: 'description',
      search: "lower(concat_ws(' ', code, description, event_key, kind))",
    },
    vacationTypes: {
      table: 'hr.vacation_type',
      name: 'description',
      search: "lower(concat_ws(' ', code, description))",
    },
  };

@Injectable()
export class RhWorkflowsService {
  constructor(private readonly databaseService: DatabaseService) {}

  listDefinitions() {
    return WORKFLOWS.map(({ key, label, legacyRoute, employeeScoped }) => ({
      key,
      label,
      legacyRoute,
      employeeScoped,
    }));
  }

  async listWorkflow(
    workflowKey: string,
    query: DomainListQueryDto,
    employeeId?: string,
  ): Promise<PagedResponse<Record<string, unknown>>> {
    this.ensureDatabase();
    const definition = this.requireWorkflow(workflowKey);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [];
    const clauses: string[] = [];

    if (employeeId) {
      if (!definition.employeeScoped) {
        throw new BadRequestException('Workflow is not employee scoped');
      }
      values.push(employeeId);
      clauses.push(`employee_id = $${values.length}::uuid`);
    }
    if (query.search) {
      values.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`${definition.search} LIKE $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const count = await this.databaseService.query<CountRow>(
      `SELECT count(*)::text AS total FROM ${definition.from} ${where}`,
      values,
    );
    const rows = await this.databaseService.query<WorkflowRow>(
      `SELECT ${definition.select} FROM ${definition.from} ${where} ORDER BY ${definition.orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toRecord(definition.key, row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async createWorkflowRecord(
    workflowKey: string,
    input: RhWorkflowMutationDto,
    employeeId?: string,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const definition = this.requireWorkflow(workflowKey);
    const effectiveEmployeeId = employeeId ?? input.employeeId;
    if (definition.employeeScoped && !effectiveEmployeeId) {
      throw new BadRequestException('employeeId is required');
    }

    await this.insertRecord(definition.key, input, effectiveEmployeeId);
    return this.findLatest(definition, effectiveEmployeeId);
  }

  async updateWorkflowRecord(
    workflowKey: string,
    id: string,
    input: RhWorkflowMutationDto,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const definition = this.requireWorkflow(workflowKey);
    await this.updateRecord(definition.key, id, input);
    return this.findById(definition, id);
  }

  async deleteWorkflowRecord(
    workflowKey: string,
    id: string,
  ): Promise<Record<string, unknown>> {
    this.ensureDatabase();
    const definition = this.requireWorkflow(workflowKey);
    const existing = await this.findById(definition, id);
    if (definition.activeDelete) {
      await this.databaseService.query(
        `UPDATE hr.${definition.table} SET ${definition.activeDelete} WHERE id = $1::uuid`,
        [id],
      );
      return this.findById(definition, id);
    }
    await this.databaseService.query(
      `DELETE FROM hr.${definition.table} WHERE id = $1::uuid`,
      [id],
    );
    return { ...existing, deleted: true };
  }

  async listLookup(
    kind: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<LookupRow>> {
    this.ensureDatabase();
    const lookup = LOOKUPS[kind];
    if (!lookup) throw new NotFoundException(`Lookup not found: ${kind}`);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [];
    const where = query.search
      ? (values.push(`%${query.search.toLowerCase()}%`),
        `WHERE ${lookup.search} LIKE $1`)
      : '';
    const count = await this.databaseService.query<CountRow>(
      `SELECT count(*)::text AS total FROM ${lookup.table} ${where}`,
      values,
    );
    const rows = await this.databaseService.query<LookupRow>(
      `SELECT id::text, code::text, ${lookup.name}::text AS name, '{}'::jsonb AS metadata FROM ${lookup.table} ${where} ORDER BY code ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );
    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows,
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async createImportRequest(kind: string, input: RhRequestDto) {
    this.ensureDatabase();
    const code = `RH_IMPORT_${kind.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`;
    return this.createRequest(
      code,
      `Importacao RH - ${kind}`,
      'PROCESS',
      input,
    );
  }

  async createReportRequest(reportKey: string, input: RhRequestDto) {
    this.ensureDatabase();
    const code = `RH_REPORT_${reportKey.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`;
    return this.createRequest(
      code,
      `Relatorio RH - ${reportKey}`,
      'GENERATE',
      input,
    );
  }

  private async createRequest(
    code: string,
    name: string,
    kind: 'PROCESS' | 'GENERATE',
    input: RhRequestDto,
  ) {
    const rows = await this.databaseService.query<RequestRow>(
      `
      WITH definition AS (
        INSERT INTO public.report_definition (tenant_id, code, module_key, name, description, status)
        VALUES (public.sgp_current_tenant_uuid(), $1, 'rh', $2, $3, 'ACTIVE'::"RecordStatus")
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
        RETURNING id
      )
      INSERT INTO public.report_request (definition_id, competence_year, competence_month, status, parameters)
      SELECT id, $4, $5, 'REQUESTED'::"ReportRequestStatus", $6::jsonb
      FROM definition
      RETURNING id, status::text, requested_at
      `,
      [
        code,
        name,
        `${kind} request generated by RH workflow`,
        input.year ?? null,
        input.month ?? null,
        JSON.stringify({
          ...input.parameters,
          employeeId: input.employeeId,
          sourceFileName: input.sourceFileName,
          requestKind: kind,
        }),
      ],
    );
    const row = rows[0];
    return {
      id: row.id,
      status: row.status,
      requestedAt: this.toIso(row.requested_at),
    };
  }

  private async insertRecord(
    key: string,
    input: RhWorkflowMutationDto,
    employeeId?: string,
  ): Promise<void> {
    switch (key) {
      case 'dependents':
        this.require(input.name, 'name');
        await this.databaseService.query(
          `INSERT INTO hr.employee_dependent (employee_id, name, cpf, birth_date, relationship, income_tax_dependent) VALUES ($1::uuid, $2, $3, NULLIF($4, '')::date, $5, $6)`,
          [
            employeeId,
            input.name?.trim(),
            clean(input.cpf),
            stringMeta(input, 'birthDate'),
            input.relationship?.trim() || 'Nao informado',
            input.incomeTaxDependent ?? false,
          ],
        );
        return;
      case 'professional-experiences':
        this.require(input.employer, 'employer');
        await this.databaseService.query(
          `INSERT INTO hr.professional_experience (employee_id, employer, role_title, starts_on, ends_on, description) VALUES ($1::uuid, $2, $3, NULLIF($4, '')::date, NULLIF($5, '')::date, $6)`,
          [
            employeeId,
            input.employer?.trim(),
            input.roleTitle?.trim() || null,
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'status-history':
        this.require(input.functionalStatusId, 'functionalStatusId');
        this.require(input.startsOn, 'startsOn');
        await this.databaseService.query(
          `INSERT INTO hr.employee_status_history (employee_id, functional_status_id, reason_id, starts_on, ends_on, notes) VALUES ($1::uuid, $2::uuid, NULLIF($3, '')::uuid, $4::date, NULLIF($5, '')::date, $6)`,
          [
            employeeId,
            input.functionalStatusId,
            input.reasonId ?? '',
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'frequencies':
        this.require(input.year, 'year');
        await this.databaseService.query(
          `INSERT INTO hr.employee_frequency (tenant_id, employee_id, year, month, absence_days, worked_days, notes) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2, $3, $4::decimal, NULLIF($5, '')::decimal, $6) ON CONFLICT (tenant_id, employee_id, year, month) DO UPDATE SET absence_days = EXCLUDED.absence_days, worked_days = EXCLUDED.worked_days, notes = EXCLUDED.notes, updated_at = now()`,
          [
            employeeId,
            input.year,
            input.month ?? null,
            input.absenceDays ?? '0',
            input.workedDays ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'service-time':
        this.require(input.source, 'source');
        this.require(input.startsOn, 'startsOn');
        await this.databaseService.query(
          `INSERT INTO hr.service_time_record (employee_id, source, starts_on, ends_on, days_count, notes) VALUES ($1::uuid, $2, $3::date, NULLIF($4, '')::date, $5, $6)`,
          [
            employeeId,
            input.source?.trim(),
            input.startsOn,
            input.endsOn ?? '',
            input.daysCount ?? null,
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'transfers':
        this.require(input.effectiveOn, 'effectiveOn');
        await this.databaseService.query(
          `INSERT INTO hr.employee_transfer (employee_id, from_branch_id, to_branch_id, to_work_location_id, reason_id, effective_on, notes) VALUES ($1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, NULLIF($5, '')::uuid, $6::date, $7)`,
          [
            employeeId,
            input.fromBranchId ?? '',
            input.toBranchId ?? '',
            input.toWorkLocationId ?? '',
            input.reasonId ?? '',
            input.effectiveOn,
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'salary-history':
        this.require(input.effectiveOn, 'effectiveOn');
        await this.databaseService.query(
          `INSERT INTO hr.salary_level_history (employee_id, salary_reference_id, level_code, level_description, adjustment_amount, effective_on) VALUES ($1::uuid, NULLIF($2, '')::uuid, $3, $4, $5::decimal, $6::date)`,
          [
            employeeId,
            input.salaryReferenceId ?? '',
            input.levelCode?.trim() || null,
            input.levelDescription?.trim() || null,
            input.adjustmentAmount ?? '0',
            input.effectiveOn,
          ],
        );
        return;
      case 'complement-data':
        await this.databaseService.query(
          `INSERT INTO hr.employee_complement_data (tenant_id, employee_id, rg, rg_issuer, pis_pasep, voter_registration, address, emergency_contact) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb) ON CONFLICT (employee_id) DO UPDATE SET rg = EXCLUDED.rg, rg_issuer = EXCLUDED.rg_issuer, pis_pasep = EXCLUDED.pis_pasep, voter_registration = EXCLUDED.voter_registration, address = EXCLUDED.address, emergency_contact = EXCLUDED.emergency_contact, updated_at = now()`,
          [
            employeeId,
            input.rg?.trim() || null,
            input.rgIssuer?.trim() || null,
            input.pisPasep?.trim() || null,
            input.voterRegistration?.trim() || null,
            JSON.stringify(input.metadata?.address ?? {}),
            JSON.stringify(input.metadata?.emergencyContact ?? {}),
          ],
        );
        return;
      case 'vacations':
        this.require(input.startsOn, 'startsOn');
        this.require(input.endsOn, 'endsOn');
        await this.databaseService.query(
          `INSERT INTO hr.vacation_record (tenant_id, employee_id, vacation_type_id, accrual_start_on, accrual_end_on, accrual_period_start, accrual_period_end, starts_on, ends_on, days, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::date, NULLIF($4, '')::date, NULLIF($3, '')::date, NULLIF($4, '')::date, $5::date, $6::date, $7, 'programado')`,
          [
            employeeId,
            input.vacationTypeId ?? '',
            stringMeta(input, 'accrualStartOn'),
            stringMeta(input, 'accrualEndOn'),
            input.startsOn,
            input.endsOn,
            input.days ?? 1,
          ],
        );
        return;
      case 'leaves':
        this.require(employeeId, 'employeeId');
        this.require(input.startsOn, 'startsOn');
        {
          const startsOn = input.startsOn!;
          const endsOn = input.endsOn ?? startsOn;
          if (
            input.endsOn &&
            new Date(startsOn).getTime() > new Date(endsOn).getTime()
          ) {
            throw new BadRequestException(
              'endsOn must be greater than startsOn',
            );
          }
          const overlap = await this.databaseService.query<CountRow>(
            `
            SELECT count(*)::text AS total
            FROM hr.leave_record
            WHERE employee_id = $1::uuid
              AND status = 'ACTIVE'::"RecordStatus"
              AND daterange(starts_on, coalesce(ends_on, starts_on), '[]')
                  && daterange($2::date, coalesce(NULLIF($3, '')::date, $2::date), '[]')
            `,
            [employeeId, startsOn, input.endsOn ?? ''],
          );
          if (Number(overlap[0]?.total ?? 0) > 0) {
            throw new BadRequestException(
              'Employee already has an active leave in the selected period',
            );
          }
          const leaveFunctionalStatus = await this.ensureFunctionalStatus(
            'AFASTAMENTO',
            'Afastamento',
            'AFASTAMENTO',
            'AFASTAMENTO',
            'ON_LEAVE',
          );
          const leaveDays =
            input.days ?? daysBetweenInclusive(startsOn, endsOn);
          await this.databaseService.query(
            `INSERT INTO hr.leave_record (employee_id, absence_reason_id, starts_on, ends_on, days, status, notes) VALUES ($1::uuid, NULLIF($2, '')::uuid, $3::date, NULLIF($4, '')::date, $5, 'ACTIVE'::"RecordStatus", $6)`,
            [
              employeeId,
              input.absenceReasonId ?? '',
              startsOn,
              input.endsOn ?? '',
              leaveDays,
              input.notes?.trim() || '',
            ],
          );
          await this.databaseService.query(
            `
            UPDATE hr.employee
            SET
              lifecycle_status = 'ON_LEAVE'::"EmployeeLifecycleStatus",
              functional_status_id = $2::uuid,
              updated_at = now()
            WHERE id = $1::uuid
            `,
            [employeeId, leaveFunctionalStatus],
          );
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
              NULLIF($3, '')::uuid,
              $4::date,
              NULLIF($5, '')::date,
              $6
            )
            `,
            [
              employeeId,
              leaveFunctionalStatus,
              input.absenceReasonId ?? '',
              startsOn,
              input.endsOn ?? '',
              input.notes?.trim() || '',
            ],
          );
          return;
        }
      case 'benefit-dependents':
        this.require(input.startsOn, 'startsOn');
        this.require(input.name, 'name');
        this.require(input.benefitCode, 'benefitCode');
        await this.databaseService.query(
          `INSERT INTO hr.employee_benefit_dependent (tenant_id, employee_id, dependent_id, dependent_name, dependent_cpf, relationship, benefit_code, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7::date, NULLIF($8, '')::date, $9, 'ACTIVE'::"RecordStatus")`,
          [
            employeeId,
            input.dependentId ?? '',
            input.name?.trim(),
            clean(input.cpf),
            input.relationship?.trim() || '',
            input.benefitCode?.trim(),
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'union-contributions':
        this.require(input.startsOn, 'startsOn');
        await this.databaseService.query(
          `INSERT INTO hr.employee_union_contribution (tenant_id, employee_id, union_id, deduction_amount, deduction_percent, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::decimal, NULLIF($4, '')::decimal, $5::date, NULLIF($6, '')::date, $7, 'ACTIVE'::"RecordStatus")`,
          [
            employeeId,
            input.unionId ?? '',
            input.deductionAmount ?? '',
            input.deductionPercent ?? '',
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        await this.syncEmployeeUnion(employeeId, input.unionId ?? null);
        return;
      case 'exercises':
        this.require(input.startsOn, 'startsOn');
        await this.databaseService.query(
          `INSERT INTO hr.employee_exercise (tenant_id, employee_id, branch_id, work_location_id, job_function_id, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5::date, NULLIF($6, '')::date, $7, 'ACTIVE'::"RecordStatus")`,
          [
            employeeId,
            input.toBranchId ?? '',
            input.toWorkLocationId ?? '',
            input.jobFunctionId ?? '',
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        await this.syncEmployeeExercise(
          employeeId,
          input.toBranchId ?? null,
          input.toWorkLocationId ?? null,
          input.jobFunctionId ?? null,
        );
        return;
      case 'alimonies':
        this.require(input.startsOn, 'startsOn');
        this.require(input.beneficiaryName, 'beneficiaryName');
        await this.databaseService.query(
          `INSERT INTO hr.employee_alimony (tenant_id, employee_id, beneficiary_name, beneficiary_cpf, court_process_number, amount, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2, $3, $4, $5::decimal, $6::date, NULLIF($7, '')::date, $8, 'ACTIVE'::"RecordStatus")`,
          [
            employeeId,
            input.beneficiaryName?.trim(),
            clean(input.beneficiaryCpf),
            input.courtProcessNumber?.trim() || null,
            input.amount ?? '0',
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'transit-benefits':
        this.require(input.startsOn, 'startsOn');
        this.require(input.transitBenefitId, 'transitBenefitId');
        await this.databaseService.query(
          `INSERT INTO hr.employee_transit_benefit (tenant_id, employee_id, transit_benefit_id, quantity, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2::uuid, $3::decimal, $4::date, NULLIF($5, '')::date, $6, 'ACTIVE'::"RecordStatus")`,
          [
            employeeId,
            input.transitBenefitId,
            input.quantity ?? '1',
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'processes':
        this.require(input.processNumber, 'processNumber');
        this.require(input.subject, 'subject');
        this.require(input.startsOn, 'startsOn');
        await this.databaseService.query(
          `INSERT INTO hr.administrative_process (tenant_id, process_number, subject, filed_on, closed_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3::date, NULLIF($4, '')::date, $5, 'ACTIVE'::"RecordStatus")`,
          [
            input.processNumber?.trim(),
            input.subject?.trim(),
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'process-functions':
        this.require(input.processId, 'processId');
        this.require(input.jobFunctionId, 'jobFunctionId');
        this.require(input.startsOn, 'startsOn');
        await this.databaseService.query(
          `INSERT INTO hr.administrative_process_function (tenant_id, process_id, job_function_id, branch_id, work_location_id, assigned_on, released_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5::date, NULLIF($6, '')::date, $7, 'ACTIVE'::"RecordStatus")`,
          [
            input.processId,
            input.jobFunctionId,
            input.toBranchId ?? '',
            input.toWorkLocationId ?? '',
            input.startsOn,
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'organic-definitions':
        this.require(input.name, 'name');
        await this.databaseService.query(
          `INSERT INTO hr.work_location (code, name, description, branch_id, parent_id, status) VALUES ($1, $2, $3, NULLIF($4, '')::uuid, NULLIF($5, '')::uuid, 'ACTIVE'::"RecordStatus")`,
          [
            stringMeta(input, 'code') ?? input.name?.trim(),
            input.name?.trim(),
            input.notes?.trim() || '',
            stringMeta(input, 'branchId') ?? '',
            stringMeta(input, 'parentId') ?? '',
          ],
        );
        return;
      default:
        throw new NotFoundException(`Workflow not found: ${key}`);
    }
  }

  private async updateRecord(
    key: string,
    id: string,
    input: RhWorkflowMutationDto,
  ): Promise<void> {
    switch (key) {
      case 'dependents':
        await this.databaseService.query(
          `UPDATE hr.employee_dependent SET name = COALESCE($2, name), cpf = $3, relationship = COALESCE($4, relationship), income_tax_dependent = $5, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.name?.trim() || null,
            clean(input.cpf),
            input.relationship?.trim() || null,
            input.incomeTaxDependent ?? false,
          ],
        );
        return;
      case 'professional-experiences':
        await this.databaseService.query(
          `UPDATE hr.professional_experience SET employer = COALESCE($2, employer), role_title = $3, starts_on = NULLIF($4, '')::date, ends_on = NULLIF($5, '')::date, description = $6, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.employer?.trim() || null,
            input.roleTitle?.trim() || null,
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'status-history':
        await this.databaseService.query(
          `UPDATE hr.employee_status_history SET functional_status_id = COALESCE(NULLIF($2, '')::uuid, functional_status_id), reason_id = NULLIF($3, '')::uuid, starts_on = COALESCE(NULLIF($4, '')::date, starts_on), ends_on = NULLIF($5, '')::date, notes = $6 WHERE id = $1::uuid`,
          [
            id,
            input.functionalStatusId ?? '',
            input.reasonId ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'frequencies':
        await this.databaseService.query(
          `UPDATE hr.employee_frequency SET year = COALESCE($2, year), month = $3, absence_days = $4::decimal, worked_days = NULLIF($5, '')::decimal, notes = $6, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.year ?? null,
            input.month ?? null,
            input.absenceDays ?? '0',
            input.workedDays ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'service-time':
        await this.databaseService.query(
          `UPDATE hr.service_time_record SET source = COALESCE($2, source), starts_on = COALESCE(NULLIF($3, '')::date, starts_on), ends_on = NULLIF($4, '')::date, days_count = $5, notes = $6, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.source?.trim() || null,
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.daysCount ?? null,
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'transfers':
        await this.databaseService.query(
          `UPDATE hr.employee_transfer SET from_branch_id = NULLIF($2, '')::uuid, to_branch_id = NULLIF($3, '')::uuid, to_work_location_id = NULLIF($4, '')::uuid, reason_id = NULLIF($5, '')::uuid, effective_on = COALESCE(NULLIF($6, '')::date, effective_on), notes = $7 WHERE id = $1::uuid`,
          [
            id,
            input.fromBranchId ?? '',
            input.toBranchId ?? '',
            input.toWorkLocationId ?? '',
            input.reasonId ?? '',
            input.effectiveOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'salary-history':
        await this.databaseService.query(
          `UPDATE hr.salary_level_history SET salary_reference_id = NULLIF($2, '')::uuid, level_code = $3, level_description = $4, adjustment_amount = $5::decimal, effective_on = COALESCE(NULLIF($6, '')::date, effective_on) WHERE id = $1::uuid`,
          [
            id,
            input.salaryReferenceId ?? '',
            input.levelCode?.trim() || null,
            input.levelDescription?.trim() || null,
            input.adjustmentAmount ?? '0',
            input.effectiveOn ?? '',
          ],
        );
        return;
      case 'complement-data':
        await this.databaseService.query(
          `UPDATE hr.employee_complement_data SET rg = $2, rg_issuer = $3, pis_pasep = $4, voter_registration = $5, address = $6::jsonb, emergency_contact = $7::jsonb, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.rg?.trim() || null,
            input.rgIssuer?.trim() || null,
            input.pisPasep?.trim() || null,
            input.voterRegistration?.trim() || null,
            JSON.stringify(input.metadata?.address ?? {}),
            JSON.stringify(input.metadata?.emergencyContact ?? {}),
          ],
        );
        return;
      case 'vacations':
        await this.databaseService.query(
          `UPDATE hr.vacation_record SET vacation_type_id = NULLIF($2, '')::uuid, starts_on = COALESCE(NULLIF($3, '')::date, starts_on), ends_on = COALESCE(NULLIF($4, '')::date, ends_on), days = COALESCE($5, days), updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.vacationTypeId ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.days ?? null,
          ],
        );
        return;
      case 'leaves':
        await this.databaseService.query(
          `UPDATE hr.leave_record SET absence_reason_id = NULLIF($2, '')::uuid, starts_on = COALESCE(NULLIF($3, '')::date, starts_on), ends_on = NULLIF($4, '')::date, days = $5, notes = $6, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.absenceReasonId ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.days ?? null,
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'benefit-dependents':
        await this.databaseService.query(
          `UPDATE hr.employee_benefit_dependent SET dependent_id = NULLIF($2, '')::uuid, dependent_name = COALESCE($3, dependent_name), dependent_cpf = $4, relationship = COALESCE($5, relationship), benefit_code = COALESCE($6, benefit_code), starts_on = COALESCE(NULLIF($7, '')::date, starts_on), ends_on = NULLIF($8, '')::date, notes = $9, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.dependentId ?? '',
            input.name?.trim() || null,
            clean(input.cpf),
            input.relationship?.trim() || null,
            input.benefitCode?.trim() || null,
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'union-contributions':
        await this.databaseService.query(
          `UPDATE hr.employee_union_contribution SET union_id = NULLIF($2, '')::uuid, deduction_amount = NULLIF($3, '')::decimal, deduction_percent = NULLIF($4, '')::decimal, starts_on = COALESCE(NULLIF($5, '')::date, starts_on), ends_on = NULLIF($6, '')::date, notes = $7, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.unionId ?? '',
            input.deductionAmount ?? '',
            input.deductionPercent ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        if (input.unionId !== undefined) {
          const employeeId = await this.findEmployeeIdByRecord(
            'employee_union_contribution',
            id,
          );
          await this.syncEmployeeUnion(employeeId, input.unionId ?? null);
        }
        return;
      case 'exercises':
        await this.databaseService.query(
          `UPDATE hr.employee_exercise SET branch_id = NULLIF($2, '')::uuid, work_location_id = NULLIF($3, '')::uuid, job_function_id = NULLIF($4, '')::uuid, starts_on = COALESCE(NULLIF($5, '')::date, starts_on), ends_on = NULLIF($6, '')::date, notes = $7, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.toBranchId ?? '',
            input.toWorkLocationId ?? '',
            input.jobFunctionId ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        if (
          input.toBranchId !== undefined ||
          input.toWorkLocationId !== undefined ||
          input.jobFunctionId !== undefined
        ) {
          const employeeId = await this.findEmployeeIdByRecord(
            'employee_exercise',
            id,
          );
          await this.syncEmployeeExercise(
            employeeId,
            input.toBranchId ?? null,
            input.toWorkLocationId ?? null,
            input.jobFunctionId ?? null,
          );
        }
        return;
      case 'alimonies':
        await this.databaseService.query(
          `UPDATE hr.employee_alimony SET beneficiary_name = COALESCE($2, beneficiary_name), beneficiary_cpf = $3, court_process_number = $4, amount = COALESCE(NULLIF($5, '')::decimal, amount), starts_on = COALESCE(NULLIF($6, '')::date, starts_on), ends_on = NULLIF($7, '')::date, notes = $8, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.beneficiaryName?.trim() || null,
            clean(input.beneficiaryCpf),
            input.courtProcessNumber?.trim() || null,
            input.amount ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'transit-benefits':
        await this.databaseService.query(
          `UPDATE hr.employee_transit_benefit SET transit_benefit_id = COALESCE(NULLIF($2, '')::uuid, transit_benefit_id), quantity = COALESCE(NULLIF($3, '')::decimal, quantity), starts_on = COALESCE(NULLIF($4, '')::date, starts_on), ends_on = NULLIF($5, '')::date, notes = $6, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.transitBenefitId ?? '',
            input.quantity ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'processes':
        await this.databaseService.query(
          `UPDATE hr.administrative_process SET process_number = COALESCE($2, process_number), subject = COALESCE($3, subject), filed_on = COALESCE(NULLIF($4, '')::date, filed_on), closed_on = NULLIF($5, '')::date, notes = $6, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.processNumber?.trim() || null,
            input.subject?.trim() || null,
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'process-functions':
        await this.databaseService.query(
          `UPDATE hr.administrative_process_function SET process_id = COALESCE(NULLIF($2, '')::uuid, process_id), job_function_id = COALESCE(NULLIF($3, '')::uuid, job_function_id), branch_id = NULLIF($4, '')::uuid, work_location_id = NULLIF($5, '')::uuid, assigned_on = COALESCE(NULLIF($6, '')::date, assigned_on), released_on = NULLIF($7, '')::date, notes = $8, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.processId ?? '',
            input.jobFunctionId ?? '',
            input.toBranchId ?? '',
            input.toWorkLocationId ?? '',
            input.startsOn ?? '',
            input.endsOn ?? '',
            input.notes?.trim() || '',
          ],
        );
        return;
      case 'organic-definitions':
        await this.databaseService.query(
          `UPDATE hr.work_location SET name = COALESCE($2, name), description = $3, branch_id = NULLIF($4, '')::uuid, parent_id = NULLIF($5, '')::uuid, updated_at = now() WHERE id = $1::uuid`,
          [
            id,
            input.name?.trim() || null,
            input.notes?.trim() || '',
            stringMeta(input, 'branchId') ?? '',
            stringMeta(input, 'parentId') ?? '',
          ],
        );
        return;
      default:
        throw new NotFoundException(`Workflow not found: ${key}`);
    }
  }

  private async findLatest(
    definition: WorkflowDefinition,
    employeeId?: string,
  ): Promise<Record<string, unknown>> {
    const where = employeeId ? 'WHERE employee_id = $1::uuid' : '';
    const rows = await this.databaseService.query<WorkflowRow>(
      `SELECT * FROM (SELECT ${definition.select} FROM ${definition.from}) records ${where} ORDER BY created_at DESC LIMIT 1`,
      employeeId ? [employeeId] : [],
    );
    if (!rows[0]) throw new NotFoundException('Workflow record not found');
    return this.toRecord(definition.key, rows[0]);
  }

  private async findById(
    definition: WorkflowDefinition,
    id: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.databaseService.query<WorkflowRow>(
      `SELECT * FROM (SELECT ${definition.select} FROM ${definition.from}) records WHERE id = $1::uuid LIMIT 1`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Workflow record not found');
    return this.toRecord(definition.key, rows[0]);
  }

  private toRecord(key: string, row: WorkflowRow): Record<string, unknown> {
    return {
      id: row.id,
      workflow: key,
      employeeId: row.employee_id,
      employeeRegistration: row.employee_registration,
      employeeName: row.employee_name,
      title: row.title,
      subtitle: row.subtitle,
      startsOn: row.starts_on ? this.toIso(row.starts_on) : null,
      endsOn: row.ends_on ? this.toIso(row.ends_on) : null,
      status: row.status,
      metadata: row.metadata ?? {},
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private requireWorkflow(key: string): WorkflowDefinition {
    const found = WORKFLOWS.find((workflow) => workflow.key === key);
    if (!found) throw new NotFoundException(`Workflow not found: ${key}`);
    return found;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for RH workflow operations',
      );
    }
  }

  private require(value: unknown, field: string): void {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`${field} is required`);
    }
  }

  private async findEmployeeIdByRecord(
    table: string,
    id: string,
  ): Promise<string> {
    const rows = await this.databaseService.query<IdRow>(
      `SELECT employee_id::text AS id FROM hr.${table} WHERE id = $1::uuid`,
      [id],
    );
    if (!rows[0]?.id) {
      throw new NotFoundException('Workflow record not found');
    }
    return rows[0].id;
  }

  private async syncEmployeeUnion(
    employeeId: string | undefined,
    unionId: string | null,
  ): Promise<void> {
    if (!employeeId || !unionId) {
      return;
    }
    await this.databaseService.query(
      `
      UPDATE hr.employee
      SET
        union_id = $2::uuid,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [employeeId, unionId],
    );
  }

  private async syncEmployeeExercise(
    employeeId: string | undefined,
    branchId: string | null,
    workLocationId: string | null,
    jobFunctionId: string | null,
  ): Promise<void> {
    if (!employeeId) {
      return;
    }
    await this.databaseService.query(
      `
      UPDATE hr.employee
      SET
        branch_id = COALESCE(NULLIF($2, '')::uuid, branch_id),
        work_location_id = COALESCE(NULLIF($3, '')::uuid, work_location_id),
        job_function_id = COALESCE(NULLIF($4, '')::uuid, job_function_id),
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [employeeId, branchId ?? '', workLocationId ?? '', jobFunctionId ?? ''],
    );
  }

  private async ensureFunctionalStatus(
    code: string,
    description: string,
    modality: string,
    kind: string,
    lifecycleStatus: string,
  ): Promise<string> {
    const rows = await this.databaseService.query<{ id: string }>(
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
        false,
        $5::"EmployeeLifecycleStatus",
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        modality = EXCLUDED.modality,
        kind = EXCLUDED.kind,
        lifecycle_status = EXCLUDED.lifecycle_status,
        status = 'ACTIVE'::"RecordStatus",
        updated_at = now()
      RETURNING id::text
      `,
      [code, description, modality, kind, lifecycleStatus],
    );
    return rows[0]?.id ?? '';
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}

function workflow(input: WorkflowDefinition): WorkflowDefinition {
  return input;
}

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

function stringMeta(input: RhWorkflowMutationDto, key: string): string | null {
  const value = input.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function daysBetweenInclusive(startsOn: string, endsOn: string): number {
  const start = new Date(startsOn);
  const end = new Date(endsOn);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}
