import { WorkflowDefinition } from './workflow-types';
import { workflow } from './workflow-utils';

export const WORKFLOWS: WorkflowDefinition[] = [
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
    table: 'organic_definition',
    employeeScoped: false,
    select:
      "od.id::text, NULL::text AS employee_id, NULL::text AS employee_registration, NULL::text AS employee_name, od.name AS title, concat(wl.code, ' / ', jp.code) AS subtitle, od.effective_from AS starts_on, od.effective_to AS ends_on, od.status::text AS status, jsonb_build_object('code', od.code, 'description', od.description, 'workLocationId', od.work_location_id, 'workLocationName', wl.name, 'jobPositionId', od.job_position_id, 'jobPositionName', jp.name, 'vacanciesTotal', od.vacancies_total, 'vacanciesFilled', od.vacancies_filled, 'vacanciesOpen', od.vacancies_open) AS metadata, od.created_at, od.updated_at",
    from: 'hr.organic_definition od JOIN hr.work_location wl ON wl.id = od.work_location_id JOIN hr.job_position jp ON jp.id = od.job_position_id',
    search:
      "lower(concat_ws(' ', od.code, od.name, od.description, wl.code, wl.name, jp.code, jp.name))",
    orderBy: 'wl.code ASC, jp.code ASC, od.effective_from DESC',
    activeDelete: 'status = \'INACTIVE\'::"RecordStatus", updated_at = now()',
  }),
];

export const LOOKUPS: Record<
  string,
  { table: string; name: string; search: string }
> = {
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
