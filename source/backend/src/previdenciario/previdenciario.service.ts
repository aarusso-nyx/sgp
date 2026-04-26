import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../database/database.service';
import {
  CreateBeneficiaryContactHistoryDto,
  CreateContributionTimeCertificateDto,
  CreateExternalLifeProofDto,
  CreatePensionGrantDto,
  CreatePensionCompensationDto,
  CreatePrevidentiaryDeclarationDto,
  CreateRecertificationBeneficiaryDto,
  CreateRecertificationCampaignDto,
  CreateRecertificationRecordDto,
  CreateRetirementGrantDto,
  CreateRetirementRuleDto,
  CreateRetirementSimulationDto,
  ExternalLifeProofChannelInput,
  GeneratePrevidenciarioOutputDto,
  PensionCompensationStatusInput,
  RecertificationStatusInput,
  RecertificationTypeInput,
  UpdatePensionCompensationDto,
  UpdateRetirementRuleDto,
} from './previdenciario.dto';

interface EmployeeRetirementRow extends QueryResultRow {
  id: string;
  registration: string;
  name: string;
  birth_date: Date | string | null;
  hired_on: Date | string | null;
  cpf: string | null;
}

interface RetirementRuleRow extends QueryResultRow {
  id: string;
  name: string;
  legal_basis: string;
  age_criteria: unknown;
  contribution_time_criteria: unknown;
  grace_period_criteria: unknown;
  applicable_employment_link: string | null;
  active: boolean;
}

interface RetirementSimulationRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  rule_id: string;
  rule_name: string;
  result: unknown;
  details_json: unknown;
  simulated_on: Date | string;
  created_by_ref: string | null;
}

interface RetirementGrantRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  rule_id: string;
  rule_name: string;
  granted_on: Date | string;
  legal_basis: string;
  appointment_act: string;
  status: string;
  notes: string;
  granted_by_ref: string | null;
}

interface PensionCompensationRow extends QueryResultRow {
  id: string;
  employee_id: string | null;
  registration: string | null;
  employee_name: string | null;
  certificate_ref: string | null;
  origin_regime: string;
  amount: string;
  status: string;
  notes: string;
}

interface PensionGrantRow extends QueryResultRow {
  id: string;
  instituting_employee_id: string | null;
  registration: string | null;
  employee_name: string | null;
  beneficiary_name: string;
  beneficiary_cpf: string | null;
  kinship: string | null;
  benefit_type: string;
  apportionment_type: string;
  share_percent: string;
  adjustment_mode: string;
  nature: string;
  granted_on: Date | string;
  ceased_on: Date | string | null;
  legal_basis: string;
  notes: string;
}

interface ContributionTimeCertificateRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  period_start: Date | string;
  period_end: Date | string;
  issuing_agency: string;
  issuance_act: string;
  storage_key: string | null;
  issued_at: Date | string;
  issued_by_ref: string | null;
}

interface PrevidentiaryDeclarationRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  type: string;
  issued_at: Date | string;
  storage_key: string | null;
  issued_by_ref: string | null;
}

interface RecertificationCampaignRow extends QueryResultRow {
  id: string;
  type: string;
  cycle_start: Date | string;
  cycle_end: Date | string;
  filter_json: unknown;
  active: boolean;
}

interface RecertificationBeneficiaryRow extends QueryResultRow {
  id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  campaign_id: string | null;
  type: string;
  next_due_date: Date | string;
  status: string;
}

interface RecertificationRecordRow extends QueryResultRow {
  id: string;
  beneficiary_id: string;
  recertified_on: Date | string;
  operator_ref: string;
  snapshot_json: unknown;
  receipt_storage_key: string | null;
}

interface ExternalLifeProofRow extends QueryResultRow {
  id: string;
  beneficiary_id: string;
  channel: string;
  authentication_json: unknown;
  proven_at: Date | string;
}

interface BeneficiaryContactHistoryRow extends QueryResultRow {
  id: string;
  beneficiary_id: string;
  employee_id: string;
  registration: string;
  employee_name: string;
  contacted_on: Date | string;
  user_ref: string;
  notes: string;
}

interface ReportRequestRow extends QueryResultRow {
  id: string;
  status: string;
  requested_at: Date | string;
}

@Injectable()
export class PrevidenciarioService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listRules() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RetirementRuleRow>(
      `
      SELECT
        id,
        name,
        legal_basis,
        age_criteria,
        contribution_time_criteria,
        grace_period_criteria,
        applicable_employment_link,
        active
      FROM hr.retirement_rule
      ORDER BY active DESC, name ASC
      `,
    );
    return rows.map((row) => this.toRuleSummary(row));
  }

  async createRule(input: CreateRetirementRuleDto) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RetirementRuleRow>(
      `
      INSERT INTO hr.retirement_rule (
        name,
        legal_basis,
        age_criteria,
        contribution_time_criteria,
        grace_period_criteria,
        applicable_employment_link,
        active
      )
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, NULLIF($6, ''), $7)
      RETURNING
        id,
        name,
        legal_basis,
        age_criteria,
        contribution_time_criteria,
        grace_period_criteria,
        applicable_employment_link,
        active
      `,
      [
        input.nome.trim(),
        input.fundamentoLegal.trim(),
        JSON.stringify(input.criteriosIdade ?? {}),
        JSON.stringify(input.criteriosTempoContribuicao ?? {}),
        JSON.stringify(input.criteriosCarencia ?? {}),
        input.vinculoAplicavel ?? '',
        input.ativa ?? true,
      ],
    );
    return this.toRuleSummary(rows[0]);
  }

  async updateRule(id: string, input: UpdateRetirementRuleDto) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RetirementRuleRow>(
      `
      UPDATE hr.retirement_rule
      SET
        name = COALESCE(NULLIF($2, ''), name),
        legal_basis = COALESCE(NULLIF($3, ''), legal_basis),
        age_criteria = COALESCE($4::jsonb, age_criteria),
        contribution_time_criteria = COALESCE($5::jsonb, contribution_time_criteria),
        grace_period_criteria = COALESCE($6::jsonb, grace_period_criteria),
        applicable_employment_link = COALESCE(NULLIF($7, ''), applicable_employment_link),
        active = COALESCE($8, active),
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        name,
        legal_basis,
        age_criteria,
        contribution_time_criteria,
        grace_period_criteria,
        applicable_employment_link,
        active
      `,
      [
        id,
        input.nome ?? '',
        input.fundamentoLegal ?? '',
        input.criteriosIdade ? JSON.stringify(input.criteriosIdade) : null,
        input.criteriosTempoContribuicao
          ? JSON.stringify(input.criteriosTempoContribuicao)
          : null,
        input.criteriosCarencia
          ? JSON.stringify(input.criteriosCarencia)
          : null,
        input.vinculoAplicavel ?? '',
        input.ativa ?? null,
      ],
    );
    if (!rows[0]) {
      throw new NotFoundException('Retirement rule not found');
    }
    return this.toRuleSummary(rows[0]);
  }

  async listSimulations() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RetirementSimulationRow>(
      `
      SELECT
        simulation.id,
        simulation.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        simulation.rule_id::text,
        rule.name AS rule_name,
        simulation.result,
        simulation.details_json,
        simulation.simulated_on,
        simulation.created_by_ref
      FROM hr.retirement_simulation simulation
      JOIN hr.employee employee ON employee.id = simulation.employee_id
      JOIN hr.retirement_rule rule ON rule.id = simulation.rule_id
      ORDER BY simulation.simulated_on DESC
      `,
    );
    return rows.map((row) => this.toSimulationSummary(row));
  }

  async createSimulation(
    input: CreateRetirementSimulationDto,
    actorUsername?: string,
  ) {
    this.ensureDatabase();
    const employee = await this.employeeRow(input.funcionarioId);
    const rule = await this.ruleRow(input.regraId);

    const simulationData = this.simulate(employee, rule, input.dataReferencia);
    const rows = await this.databaseService.query<RetirementSimulationRow>(
      `
      INSERT INTO hr.retirement_simulation (
        employee_id,
        rule_id,
        result,
        details_json,
        created_by_ref
      )
      VALUES ($1::uuid, $2::uuid, $3::jsonb, $4::jsonb, NULLIF($5, ''))
      RETURNING
        id,
        employee_id::text,
        $6::text AS registration,
        $7::text AS employee_name,
        rule_id::text,
        $8::text AS rule_name,
        result,
        details_json,
        simulated_on,
        created_by_ref
      `,
      [
        input.funcionarioId,
        input.regraId,
        JSON.stringify(simulationData.resultado),
        JSON.stringify(simulationData.detalhe),
        actorUsername ?? '',
        employee.registration,
        employee.name,
        rule.name,
      ],
    );
    return this.toSimulationSummary(rows[0]);
  }

  async listRetirementGrants() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RetirementGrantRow>(
      `
      SELECT
        grant_row.id,
        grant_row.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        grant_row.rule_id::text,
        rule.name AS rule_name,
        grant_row.granted_on,
        grant_row.legal_basis,
        grant_row.appointment_act,
        grant_row.status,
        grant_row.notes,
        grant_row.granted_by_ref
      FROM hr.retirement_grant grant_row
      JOIN hr.employee employee ON employee.id = grant_row.employee_id
      JOIN hr.retirement_rule rule ON rule.id = grant_row.rule_id
      ORDER BY grant_row.granted_on DESC, grant_row.created_at DESC
      `,
    );
    return rows.map((row) => this.toGrantSummary(row));
  }

  async createRetirementGrant(
    input: CreateRetirementGrantDto,
    actorUsername?: string,
  ) {
    this.ensureDatabase();
    const employee = await this.employeeRow(input.funcionarioId);
    const rule = await this.ruleRow(input.regraId);
    const simulationData = this.simulate(employee, rule, input.dataConcessao);
    if (!simulationData.resultado.elegivel) {
      throw new BadRequestException(
        'Employee is not eligible for retirement rule',
      );
    }

    const rows = await this.databaseService.query<RetirementGrantRow>(
      `
      WITH inserted_grant AS (
        INSERT INTO hr.retirement_grant (
          employee_id,
          rule_id,
          granted_on,
          legal_basis,
          appointment_act,
          status,
          notes,
          granted_by_ref
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::date,
          $4,
          $5,
          'CONCEDIDA',
          $6,
          NULLIF($7, '')
        )
        RETURNING *
      ),
      updated_employee AS (
        UPDATE hr.employee
        SET lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
            terminated_on = $3::date,
            updated_at = now()
        WHERE id = $1::uuid
      ),
      inserted_beneficiary AS (
        INSERT INTO hr.recertification_beneficiary (
          employee_id,
          type,
          next_due_date,
          status
        )
        VALUES (
          $1::uuid,
          'RETIREE'::"RecertificationBeneficiaryType",
          ($3::date + INTERVAL '6 months')::date,
          'PENDING'::"RecertificationStatus"
        )
        ON CONFLICT (employee_id) DO UPDATE
          SET type = EXCLUDED.type,
              next_due_date = EXCLUDED.next_due_date,
              status = EXCLUDED.status,
              updated_at = now()
        RETURNING id
      )
      SELECT
        grant_row.id,
        grant_row.employee_id::text,
        $8::text AS registration,
        $9::text AS employee_name,
        grant_row.rule_id::text,
        $10::text AS rule_name,
        grant_row.granted_on,
        grant_row.legal_basis,
        grant_row.appointment_act,
        grant_row.status,
        grant_row.notes,
        grant_row.granted_by_ref
      FROM inserted_grant grant_row
      `,
      [
        input.funcionarioId,
        input.regraId,
        input.dataConcessao,
        input.fundamento.trim(),
        input.atoNomeacao.trim(),
        input.observacao?.trim() ?? '',
        input.concedidaPorId ?? actorUsername ?? '',
        employee.registration,
        employee.name,
        rule.name,
      ],
    );
    return this.toGrantSummary(rows[0]);
  }

  async listPensions() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PensionGrantRow>(
      `
      SELECT
        pension.id,
        pension.instituting_employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        pension.beneficiary_name,
        pension.beneficiary_cpf,
        pension.kinship,
        pension.benefit_type,
        pension.apportionment_type,
        pension.share_percent::text,
        pension.adjustment_mode,
        pension.nature,
        pension.granted_on,
        pension.ceased_on,
        pension.legal_basis,
        pension.notes
      FROM hr.pension_grant pension
      LEFT JOIN hr.employee employee
        ON employee.id = pension.instituting_employee_id
      ORDER BY pension.granted_on DESC, pension.created_at DESC
      `,
    );
    return rows.map((row) => this.toPensionSummary(row));
  }

  async createPension(input: CreatePensionGrantDto) {
    this.ensureDatabase();
    let employee: EmployeeRetirementRow | null = null;
    if (input.funcionarioInstituidorId) {
      employee = await this.employeeRow(input.funcionarioInstituidorId);
    }
    const rows = await this.databaseService.query<PensionGrantRow>(
      `
      INSERT INTO hr.pension_grant (
        instituting_employee_id,
        beneficiary_name,
        beneficiary_cpf,
        kinship,
        benefit_type,
        apportionment_type,
        share_percent,
        adjustment_mode,
        nature,
        granted_on,
        ceased_on,
        legal_basis,
        notes
      )
      VALUES (
        NULLIF($1, '')::uuid,
        $2,
        NULLIF($3, ''),
        NULLIF($4, ''),
        $5,
        $6,
        $7::decimal,
        $8,
        $9,
        $10::date,
        NULLIF($11, '')::date,
        $12,
        $13
      )
      RETURNING
        id,
        instituting_employee_id::text,
        $14::text AS registration,
        $15::text AS employee_name,
        beneficiary_name,
        beneficiary_cpf,
        kinship,
        benefit_type,
        apportionment_type,
        share_percent::text,
        adjustment_mode,
        nature,
        granted_on,
        ceased_on,
        legal_basis,
        notes
      `,
      [
        input.funcionarioInstituidorId ?? '',
        input.nomeBeneficiario.trim(),
        input.cpfBeneficiario ?? '',
        input.parentesco ?? '',
        input.tipoBeneficio.trim(),
        input.tipoRateio.trim(),
        input.cotaParte,
        input.formaReajuste.trim(),
        input.natureza.trim(),
        input.dataConcessao,
        input.dataCessacao ?? '',
        input.fundamento.trim(),
        input.observacao?.trim() ?? '',
        employee?.registration ?? null,
        employee?.name ?? null,
      ],
    );
    return this.toPensionSummary(rows[0]);
  }

  async listContributionTimeCertificates() {
    this.ensureDatabase();
    const rows =
      await this.databaseService.query<ContributionTimeCertificateRow>(
        `
      SELECT
        certificate.id,
        certificate.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        certificate.period_start,
        certificate.period_end,
        certificate.issuing_agency,
        certificate.issuance_act,
        certificate.storage_key,
        certificate.issued_at,
        certificate.issued_by_ref
      FROM hr.contribution_time_certificate certificate
      JOIN hr.employee employee ON employee.id = certificate.employee_id
      ORDER BY certificate.issued_at DESC
      `,
      );
    return rows.map((row) => this.toContributionTimeCertificateSummary(row));
  }

  async createContributionTimeCertificate(
    input: CreateContributionTimeCertificateDto,
  ) {
    this.ensureDatabase();
    const employee = await this.employeeRow(input.funcionarioId);
    const rows =
      await this.databaseService.query<ContributionTimeCertificateRow>(
        `
      INSERT INTO hr.contribution_time_certificate (
        employee_id,
        period_start,
        period_end,
        issuing_agency,
        issuance_act,
        storage_key,
        issued_at,
        issued_by_ref
      )
      VALUES (
        $1::uuid,
        $2::date,
        $3::date,
        $4,
        $5,
        NULLIF($6, ''),
        now(),
        NULLIF($7, '')
      )
      RETURNING
        id,
        employee_id::text,
        $8::text AS registration,
        $9::text AS employee_name,
        period_start,
        period_end,
        issuing_agency,
        issuance_act,
        storage_key,
        issued_at,
        issued_by_ref
      `,
        [
          input.funcionarioId,
          input.periodoInicio,
          input.periodoFim,
          input.orgaoEmitente.trim(),
          input.atoEmissao.trim(),
          input.storageKey ?? '',
          input.emitidaPorId ?? '',
          employee.registration,
          employee.name,
        ],
      );
    return this.toContributionTimeCertificateSummary(rows[0]);
  }

  async requestContributionTimeCertificateOutput(
    certificateId: string,
    input: GeneratePrevidenciarioOutputDto,
  ) {
    const exists = await this.databaseService.query<QueryResultRow>(
      `SELECT 1 FROM hr.contribution_time_certificate WHERE id = $1::uuid`,
      [certificateId],
    );
    if (!exists[0]) {
      throw new NotFoundException('Contribution time certificate not found');
    }
    return this.createReportRequest(
      'PREVIDENCIARIO_CTC',
      'Certidao de tempo de contribuicao',
      {
        certificateId,
        format: input.formato ?? 'PDF',
      },
    );
  }

  async listDeclarations() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PrevidentiaryDeclarationRow>(
      `
      SELECT
        declaration.id,
        declaration.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        declaration.type,
        declaration.issued_at,
        declaration.storage_key,
        declaration.issued_by_ref
      FROM hr.previdentiary_declaration declaration
      JOIN hr.employee employee ON employee.id = declaration.employee_id
      ORDER BY declaration.issued_at DESC
      `,
    );
    return rows.map((row) => this.toDeclarationSummary(row));
  }

  async createDeclaration(input: CreatePrevidentiaryDeclarationDto) {
    this.ensureDatabase();
    const employee = await this.employeeRow(input.funcionarioId);
    const rows = await this.databaseService.query<PrevidentiaryDeclarationRow>(
      `
      INSERT INTO hr.previdentiary_declaration (
        employee_id,
        type,
        issued_at,
        storage_key,
        issued_by_ref
      )
      VALUES (
        $1::uuid,
        $2,
        now(),
        NULLIF($3, ''),
        NULLIF($4, '')
      )
      RETURNING
        id,
        employee_id::text,
        $5::text AS registration,
        $6::text AS employee_name,
        type,
        issued_at,
        storage_key,
        issued_by_ref
      `,
      [
        input.funcionarioId,
        input.tipo.trim(),
        input.storageKey ?? '',
        input.emitidaPorId ?? '',
        employee.registration,
        employee.name,
      ],
    );
    return this.toDeclarationSummary(rows[0]);
  }

  async requestDeclarationOutput(
    declarationId: string,
    input: GeneratePrevidenciarioOutputDto,
  ) {
    const exists = await this.databaseService.query<QueryResultRow>(
      `SELECT 1 FROM hr.previdentiary_declaration WHERE id = $1::uuid`,
      [declarationId],
    );
    if (!exists[0]) {
      throw new NotFoundException('Previdentiary declaration not found');
    }
    return this.createReportRequest(
      'PREVIDENCIARIO_DECLARACAO',
      'Declaracao previdenciaria',
      {
        declarationId,
        format: input.formato ?? 'PDF',
      },
    );
  }

  async listCompensations() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PensionCompensationRow>(
      `
      SELECT
        compensation.id,
        compensation.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        compensation.certificate_ref,
        compensation.origin_regime,
        compensation.amount::text,
        compensation.status::text AS status,
        compensation.notes
      FROM hr.pension_compensation compensation
      LEFT JOIN hr.employee employee ON employee.id = compensation.employee_id
      ORDER BY compensation.created_at DESC
      `,
    );
    return rows.map((row) => this.toCompensationSummary(row));
  }

  async createCompensation(input: CreatePensionCompensationDto) {
    this.ensureDatabase();
    if (input.funcionarioId) {
      await this.employeeRow(input.funcionarioId);
    }
    const rows = await this.databaseService.query<PensionCompensationRow>(
      `
      INSERT INTO hr.pension_compensation (
        employee_id,
        certificate_ref,
        origin_regime,
        amount,
        status,
        notes
      )
      VALUES (
        NULLIF($1, '')::uuid,
        NULLIF($2, ''),
        $3,
        $4::decimal,
        $5::"PensionCompensationStatus",
        $6
      )
      RETURNING
        id,
        employee_id::text,
        NULL::text AS registration,
        NULL::text AS employee_name,
        certificate_ref,
        origin_regime,
        amount::text,
        status::text AS status,
        notes
      `,
      [
        input.funcionarioId ?? '',
        input.certidaoReferencia ?? '',
        input.regimeOrigem.trim(),
        input.valor,
        this.toCompensationStatusDb(input.status ?? 'RASCUNHO'),
        input.observacao?.trim() ?? '',
      ],
    );
    return this.toCompensationSummary(rows[0]);
  }

  async updateCompensation(id: string, input: UpdatePensionCompensationDto) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PensionCompensationRow>(
      `
      UPDATE hr.pension_compensation compensation
      SET
        status = COALESCE($2::"PensionCompensationStatus", compensation.status),
        notes = COALESCE($3, compensation.notes),
        updated_at = now()
      WHERE compensation.id = $1::uuid
      RETURNING
        compensation.id,
        compensation.employee_id::text,
        NULL::text AS registration,
        NULL::text AS employee_name,
        compensation.certificate_ref,
        compensation.origin_regime,
        compensation.amount::text,
        compensation.status::text AS status,
        compensation.notes
      `,
      [
        id,
        input.status ? this.toCompensationStatusDb(input.status) : null,
        input.observacao ?? null,
      ],
    );
    if (!rows[0]) {
      throw new NotFoundException('Pension compensation not found');
    }
    return this.toCompensationSummary(rows[0]);
  }

  async listCampaigns() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RecertificationCampaignRow>(
      `
      SELECT
        id,
        type::text AS type,
        cycle_start,
        cycle_end,
        filter_json,
        active
      FROM hr.recertification_campaign
      ORDER BY active DESC, cycle_end DESC
      `,
    );
    return rows.map((row) => this.toCampaignSummary(row));
  }

  async createCampaign(input: CreateRecertificationCampaignDto) {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RecertificationCampaignRow>(
      `
      INSERT INTO hr.recertification_campaign (
        type,
        cycle_start,
        cycle_end,
        filter_json,
        active
      )
      VALUES ($1::"RecertificationBeneficiaryType", $2::date, $3::date, $4::jsonb, $5)
      RETURNING
        id,
        type::text AS type,
        cycle_start,
        cycle_end,
        filter_json,
        active
      `,
      [
        this.toRecertificationTypeDb(input.tipo),
        input.cicloInicio,
        input.cicloFim,
        JSON.stringify(input.filtro ?? {}),
        input.ativa ?? true,
      ],
    );
    return this.toCampaignSummary(rows[0]);
  }

  async listBeneficiaries() {
    this.ensureDatabase();
    const rows =
      await this.databaseService.query<RecertificationBeneficiaryRow>(
        `
      SELECT
        beneficiary.id,
        beneficiary.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        beneficiary.campaign_id::text,
        beneficiary.type::text AS type,
        beneficiary.next_due_date,
        beneficiary.status::text AS status
      FROM hr.recertification_beneficiary beneficiary
      JOIN hr.employee employee ON employee.id = beneficiary.employee_id
      ORDER BY beneficiary.next_due_date ASC
      `,
      );
    return rows.map((row) => this.toBeneficiarySummary(row));
  }

  async listPendingRecertifications() {
    this.ensureDatabase();
    const rows =
      await this.databaseService.query<RecertificationBeneficiaryRow>(
        `
      SELECT
        beneficiary.id,
        beneficiary.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        beneficiary.campaign_id::text,
        beneficiary.type::text AS type,
        beneficiary.next_due_date,
        beneficiary.status::text AS status
      FROM hr.recertification_beneficiary beneficiary
      JOIN hr.employee employee ON employee.id = beneficiary.employee_id
      WHERE beneficiary.status IN (
        'PENDING'::"RecertificationStatus",
        'NEAR_DUE'::"RecertificationStatus",
        'OVERDUE'::"RecertificationStatus",
        'BLOCKED'::"RecertificationStatus"
      )
      ORDER BY beneficiary.next_due_date ASC
      `,
      );
    return rows.map((row) => this.toBeneficiarySummary(row));
  }

  async createBeneficiary(input: CreateRecertificationBeneficiaryDto) {
    this.ensureDatabase();
    const employee = await this.employeeRow(input.funcionarioId);
    const rows =
      await this.databaseService.query<RecertificationBeneficiaryRow>(
        `
      INSERT INTO hr.recertification_beneficiary (
        employee_id,
        campaign_id,
        type,
        next_due_date,
        status
      )
      VALUES (
        $1::uuid,
        NULLIF($2, '')::uuid,
        $3::"RecertificationBeneficiaryType",
        $4::date,
        $5::"RecertificationStatus"
      )
      ON CONFLICT (employee_id) DO UPDATE
      SET
        campaign_id = EXCLUDED.campaign_id,
        type = EXCLUDED.type,
        next_due_date = EXCLUDED.next_due_date,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING
        id,
        employee_id::text,
        $6::text AS registration,
        $7::text AS employee_name,
        campaign_id::text,
        type::text AS type,
        next_due_date,
        status::text AS status
      `,
        [
          input.funcionarioId,
          input.campanhaId ?? '',
          this.toRecertificationTypeDb(input.tipo),
          input.dataProxima,
          this.toRecertificationStatusDb(input.status ?? 'PENDENTE'),
          employee.registration,
          employee.name,
        ],
      );
    return this.toBeneficiarySummary(rows[0]);
  }

  async createRecord(input: CreateRecertificationRecordDto) {
    this.ensureDatabase();
    await this.beneficiaryRow(input.beneficiarioId);
    const rows = await this.databaseService.query<RecertificationRecordRow>(
      `
      WITH inserted_record AS (
        INSERT INTO hr.recertification_record (
          beneficiary_id,
          recertified_on,
          operator_ref,
          snapshot_json,
          receipt_storage_key
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3,
          $4::jsonb,
          NULLIF($5, '')
        )
        RETURNING *
      ),
      updated_beneficiary AS (
        UPDATE hr.recertification_beneficiary
        SET
          status = 'RECERTIFIED'::"RecertificationStatus",
          next_due_date = ($2::date + INTERVAL '12 months')::date,
          updated_at = now()
        WHERE id = $1::uuid
      )
      SELECT
        id,
        beneficiary_id::text,
        recertified_on,
        operator_ref,
        snapshot_json,
        receipt_storage_key
      FROM inserted_record
      `,
      [
        input.beneficiarioId,
        input.data,
        input.operadorId.trim(),
        JSON.stringify(input.dadosSnapshot ?? {}),
        input.comprovanteStorageKey ?? '',
      ],
    );
    return this.toRecordSummary(rows[0]);
  }

  async createExternalLifeProof(input: CreateExternalLifeProofDto) {
    this.ensureDatabase();
    await this.beneficiaryRow(input.beneficiarioId);
    const rows = await this.databaseService.query<ExternalLifeProofRow>(
      `
      WITH inserted_proof AS (
        INSERT INTO hr.external_life_proof (
          beneficiary_id,
          channel,
          authentication_json,
          proven_at
        )
        VALUES (
          $1::uuid,
          $2::"ExternalLifeProofChannel",
          $3::jsonb,
          $4::timestamptz
        )
        RETURNING *
      ),
      updated_beneficiary AS (
        UPDATE hr.recertification_beneficiary
        SET
          status = 'RECERTIFIED'::"RecertificationStatus",
          next_due_date = (($4::timestamptz)::date + INTERVAL '12 months')::date,
          updated_at = now()
        WHERE id = $1::uuid
      )
      SELECT
        id,
        beneficiary_id::text,
        channel::text AS channel,
        authentication_json,
        proven_at
      FROM inserted_proof
      `,
      [
        input.beneficiarioId,
        input.canal,
        JSON.stringify(input.autenticacao ?? {}),
        input.data,
      ],
    );
    return this.toLifeProofSummary(rows[0]);
  }

  async listBeneficiaryContactHistory() {
    this.ensureDatabase();
    const rows = await this.databaseService.query<BeneficiaryContactHistoryRow>(
      `
      SELECT
        history.id,
        history.beneficiary_id::text,
        beneficiary.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        history.contacted_on,
        history.user_ref,
        history.notes
      FROM hr.beneficiary_contact_history history
      JOIN hr.recertification_beneficiary beneficiary
        ON beneficiary.id = history.beneficiary_id
      JOIN hr.employee employee ON employee.id = beneficiary.employee_id
      ORDER BY history.contacted_on DESC, history.created_at DESC
      `,
    );
    return rows.map((row) => this.toBeneficiaryContactHistorySummary(row));
  }

  async createBeneficiaryContactHistory(
    input: CreateBeneficiaryContactHistoryDto,
  ) {
    this.ensureDatabase();
    await this.beneficiaryRow(input.beneficiarioId);
    const rows = await this.databaseService.query<BeneficiaryContactHistoryRow>(
      `
      INSERT INTO hr.beneficiary_contact_history (
        beneficiary_id,
        contacted_on,
        user_ref,
        notes
      )
      SELECT
        $1::uuid,
        $2::date,
        $3,
        $4
      RETURNING
        id,
        beneficiary_id::text,
        (
          SELECT beneficiary.employee_id::text
          FROM hr.recertification_beneficiary beneficiary
          WHERE beneficiary.id = $1::uuid
        ) AS employee_id,
        (
          SELECT employee.registration
          FROM hr.recertification_beneficiary beneficiary
          JOIN hr.employee employee ON employee.id = beneficiary.employee_id
          WHERE beneficiary.id = $1::uuid
        ) AS registration,
        (
          SELECT employee.name
          FROM hr.recertification_beneficiary beneficiary
          JOIN hr.employee employee ON employee.id = beneficiary.employee_id
          WHERE beneficiary.id = $1::uuid
        ) AS employee_name,
        contacted_on,
        user_ref,
        notes
      `,
      [
        input.beneficiarioId,
        input.data,
        input.usuarioId.trim(),
        input.observacao?.trim() ?? '',
      ],
    );
    return this.toBeneficiaryContactHistorySummary(rows[0]);
  }

  async requestRecertificationNotice(input: GeneratePrevidenciarioOutputDto) {
    return this.createReportRequest(
      'PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO',
      'Convocacao de recadastramento',
      {
        campaignId: input.campanhaId ?? null,
        competence: input.competencia ?? null,
        format: input.formato ?? 'PDF',
      },
    );
  }

  async requestRecertificationPendingReport(
    input: GeneratePrevidenciarioOutputDto,
  ) {
    return this.createReportRequest(
      'PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS',
      'Relatorio de pendencias de recadastramento',
      {
        campaignId: input.campanhaId ?? null,
        competence: input.competencia ?? null,
        format: input.formato ?? 'PDF',
      },
    );
  }

  async requestSiprevExport(input: GeneratePrevidenciarioOutputDto) {
    return this.createReportRequest(
      'PREVIDENCIARIO_SIPREV_EXPORT',
      'Exportacao SIPREV',
      {
        competence: input.competencia ?? null,
        format: input.formato ?? 'XML',
      },
    );
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private async employeeRow(id: string): Promise<EmployeeRetirementRow> {
    const rows = await this.databaseService.query<EmployeeRetirementRow>(
      `
      SELECT id, registration, name, birth_date, hired_on, cpf
      FROM hr.employee
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Employee not found');
    }
    return rows[0];
  }

  private async ruleRow(id: string): Promise<RetirementRuleRow> {
    const rows = await this.databaseService.query<RetirementRuleRow>(
      `
      SELECT
        id,
        name,
        legal_basis,
        age_criteria,
        contribution_time_criteria,
        grace_period_criteria,
        applicable_employment_link,
        active
      FROM hr.retirement_rule
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Retirement rule not found');
    }
    return rows[0];
  }

  private async beneficiaryRow(id: string) {
    const rows = await this.databaseService.query<QueryResultRow>(
      `SELECT id FROM hr.recertification_beneficiary WHERE id = $1::uuid`,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Recertification beneficiary not found');
    }
  }

  private simulate(
    employee: EmployeeRetirementRow,
    rule: RetirementRuleRow,
    referenceDate: string,
  ) {
    const ageYears = this.diffYears(employee.birth_date, referenceDate);
    const contributionYears = this.diffYears(employee.hired_on, referenceDate);
    const ageCriteria = this.asObject(rule.age_criteria);
    const contributionCriteria = this.asObject(rule.contribution_time_criteria);
    const minAge = this.numberish(ageCriteria.minYears);
    const minContribution = this.numberish(contributionCriteria.minYears);
    const missingAge = Math.max(0, minAge - ageYears);
    const missingContribution = Math.max(
      0,
      minContribution - contributionYears,
    );
    const elegivel = missingAge <= 0 || missingContribution <= 0;
    const estimatedBenefit = Number((contributionYears * 120).toFixed(2));

    return {
      resultado: {
        elegivel,
        idadeAnos: ageYears,
        tempoContribuicao: contributionYears,
        proventoEstimado: estimatedBenefit,
      },
      detalhe: {
        referencia: referenceDate,
        criteriosAtendidos: [
          ...(missingAge <= 0 ? ['IDADE_MINIMA'] : []),
          ...(missingContribution <= 0 ? ['TEMPO_CONTRIBUICAO'] : []),
        ],
        pendencias: {
          idadeAnos: missingAge,
          tempoContribuicaoAnos: missingContribution,
        },
        cpf: employee.cpf,
      },
    };
  }

  private toRuleSummary(row: RetirementRuleRow) {
    return {
      id: row.id,
      nome: row.name,
      fundamentoLegal: row.legal_basis,
      criteriosIdade: this.asObject(row.age_criteria),
      criteriosTempoContribuicao: this.asObject(row.contribution_time_criteria),
      criteriosCarencia: this.asObject(row.grace_period_criteria),
      vinculoAplicavel: row.applicable_employment_link,
      ativa: row.active,
    };
  }

  private toSimulationSummary(row: RetirementSimulationRow) {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      regraId: row.rule_id,
      regra: row.rule_name,
      resultado: this.asObject(row.result),
      detalheJson: this.asObject(row.details_json),
      simuladaEm: this.toIso(row.simulated_on),
      criadaPor: row.created_by_ref,
    };
  }

  private toGrantSummary(row: RetirementGrantRow) {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      regraId: row.rule_id,
      regra: row.rule_name,
      dataConcessao: this.toIsoDate(row.granted_on),
      fundamento: row.legal_basis,
      atoNomeacao: row.appointment_act,
      status: row.status,
      observacao: row.notes,
      concedidaPor: row.granted_by_ref,
    };
  }

  private toPensionSummary(row: PensionGrantRow) {
    return {
      id: row.id,
      funcionarioInstituidorId: row.instituting_employee_id,
      matriculaInstituidor: row.registration,
      nomeInstituidor: row.employee_name,
      nomeBeneficiario: row.beneficiary_name,
      cpfBeneficiario: row.beneficiary_cpf,
      parentesco: row.kinship,
      tipoBeneficio: row.benefit_type,
      tipoRateio: row.apportionment_type,
      cotaParte: Number(row.share_percent),
      formaReajuste: row.adjustment_mode,
      natureza: row.nature,
      dataConcessao: this.toIsoDate(row.granted_on),
      dataCessacao: row.ceased_on ? this.toIsoDate(row.ceased_on) : null,
      fundamento: row.legal_basis,
      observacao: row.notes,
    };
  }

  private toContributionTimeCertificateSummary(
    row: ContributionTimeCertificateRow,
  ) {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      periodoInicio: this.toIsoDate(row.period_start),
      periodoFim: this.toIsoDate(row.period_end),
      orgaoEmitente: row.issuing_agency,
      atoEmissao: row.issuance_act,
      storageKey: row.storage_key,
      emitidaEm: this.toIso(row.issued_at),
      emitidaPor: row.issued_by_ref,
    };
  }

  private toDeclarationSummary(row: PrevidentiaryDeclarationRow) {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      tipo: row.type,
      storageKey: row.storage_key,
      emitidaEm: this.toIso(row.issued_at),
      emitidaPor: row.issued_by_ref,
    };
  }

  private toCompensationSummary(row: PensionCompensationRow) {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      certidaoReferencia: row.certificate_ref,
      regimeOrigem: row.origin_regime,
      valor: Number(row.amount),
      status: this.toCompensationStatusInput(row.status),
      observacao: row.notes,
    };
  }

  private toCampaignSummary(row: RecertificationCampaignRow) {
    return {
      id: row.id,
      tipo: this.toRecertificationTypeInput(row.type),
      cicloInicio: this.toIsoDate(row.cycle_start),
      cicloFim: this.toIsoDate(row.cycle_end),
      filtro: this.asObject(row.filter_json),
      ativa: row.active,
    };
  }

  private toBeneficiarySummary(row: RecertificationBeneficiaryRow) {
    return {
      id: row.id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      campanhaId: row.campaign_id,
      tipo: this.toRecertificationTypeInput(row.type),
      dataProxima: this.toIsoDate(row.next_due_date),
      status: this.toRecertificationStatusInput(row.status),
    };
  }

  private toRecordSummary(row: RecertificationRecordRow) {
    return {
      id: row.id,
      beneficiarioId: row.beneficiary_id,
      data: this.toIsoDate(row.recertified_on),
      operadorId: row.operator_ref,
      dadosSnapshot: this.asObject(row.snapshot_json),
      comprovanteStorageKey: row.receipt_storage_key,
    };
  }

  private toLifeProofSummary(row: ExternalLifeProofRow) {
    return {
      id: row.id,
      beneficiarioId: row.beneficiary_id,
      canal: row.channel as ExternalLifeProofChannelInput,
      autenticacao: this.asObject(row.authentication_json),
      data: this.toIso(row.proven_at),
    };
  }

  private toBeneficiaryContactHistorySummary(
    row: BeneficiaryContactHistoryRow,
  ) {
    return {
      id: row.id,
      beneficiarioId: row.beneficiary_id,
      funcionarioId: row.employee_id,
      matricula: row.registration,
      nome: row.employee_name,
      data: this.toIsoDate(row.contacted_on),
      usuarioId: row.user_ref,
      observacao: row.notes,
    };
  }

  private toCompensationStatusDb(
    value: PensionCompensationStatusInput,
  ): string {
    switch (value) {
      case 'RASCUNHO':
        return 'DRAFT';
      case 'SOLICITADA':
        return 'REQUESTED';
      case 'APROVADA':
        return 'APPROVED';
      case 'REPROVADA':
        return 'REJECTED';
      case 'LIQUIDADA':
        return 'SETTLED';
    }
  }

  private toCompensationStatusInput(
    value: string,
  ): PensionCompensationStatusInput {
    switch (value) {
      case 'DRAFT':
        return 'RASCUNHO';
      case 'REQUESTED':
        return 'SOLICITADA';
      case 'APPROVED':
        return 'APROVADA';
      case 'REJECTED':
        return 'REPROVADA';
      case 'SETTLED':
      default:
        return 'LIQUIDADA';
    }
  }

  private toRecertificationTypeDb(value: RecertificationTypeInput): string {
    switch (value) {
      case 'APOSENTADO':
        return 'RETIREE';
      case 'PENSIONISTA':
        return 'PENSIONER';
      case 'PENSIONISTA_UNIVERSITARIO':
        return 'UNIVERSITY_PENSIONER';
    }
  }

  private toRecertificationTypeInput(value: string): RecertificationTypeInput {
    switch (value) {
      case 'RETIREE':
        return 'APOSENTADO';
      case 'PENSIONER':
        return 'PENSIONISTA';
      case 'UNIVERSITY_PENSIONER':
      default:
        return 'PENSIONISTA_UNIVERSITARIO';
    }
  }

  private toRecertificationStatusDb(value: RecertificationStatusInput): string {
    switch (value) {
      case 'PENDENTE':
        return 'PENDING';
      case 'RECADASTRADO':
        return 'RECERTIFIED';
      case 'PROXIMO_VENCIMENTO':
        return 'NEAR_DUE';
      case 'VENCIDO':
        return 'OVERDUE';
      case 'BLOQUEADO':
        return 'BLOCKED';
    }
  }

  private toRecertificationStatusInput(
    value: string,
  ): RecertificationStatusInput {
    switch (value) {
      case 'PENDING':
        return 'PENDENTE';
      case 'RECERTIFIED':
        return 'RECADASTRADO';
      case 'NEAR_DUE':
        return 'PROXIMO_VENCIMENTO';
      case 'OVERDUE':
        return 'VENCIDO';
      case 'BLOCKED':
      default:
        return 'BLOQUEADO';
    }
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string' && value.trim()) {
      return JSON.parse(value) as Record<string, unknown>;
    }
    return {};
  }

  private numberish(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private diffYears(
    dateValue: Date | string | null,
    referenceDate: string,
  ): number {
    if (!dateValue) return 0;
    const source = new Date(dateValue);
    const reference = new Date(referenceDate);
    let years = reference.getUTCFullYear() - source.getUTCFullYear();
    const sourceMonth = source.getUTCMonth();
    const referenceMonth = reference.getUTCMonth();
    if (
      referenceMonth < sourceMonth ||
      (referenceMonth === sourceMonth &&
        reference.getUTCDate() < source.getUTCDate())
    ) {
      years -= 1;
    }
    return Math.max(0, years);
  }

  private toIso(value: Date | string): string {
    return new Date(value).toISOString();
  }

  private toIsoDate(value: Date | string): string {
    return this.toIso(value).slice(0, 10);
  }

  private async createReportRequest(
    code: string,
    name: string,
    parameters: Record<string, unknown>,
  ) {
    const definitionId = await this.ensureDefinition(
      code,
      name,
      `GENERATE request generated by previdenciario runtime for ${code}`,
    );
    const rows = await this.databaseService.query<ReportRequestRow>(
      `
      INSERT INTO public.report_request (
        definition_id,
        status,
        parameters
      )
      VALUES (
        $1::uuid,
        'REQUESTED'::"ReportRequestStatus",
        $2::jsonb
      )
      RETURNING id, status::text AS status, requested_at
      `,
      [definitionId, JSON.stringify(parameters)],
    );
    return {
      id: rows[0]?.id ?? '',
      status: rows[0]?.status ?? 'REQUESTED',
      requestedAt: this.toIso(rows[0]?.requested_at ?? new Date()),
    };
  }

  private async ensureDefinition(
    code: string,
    name: string,
    description: string,
  ): Promise<string> {
    const rows = await this.databaseService.query<
      { id: string } & QueryResultRow
    >(
      `
      WITH inserted AS (
        INSERT INTO public.report_definition (
          tenant_id,
          code,
          name,
          description,
          module_key,
          status
        )
        SELECT
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          $3,
          'previdenciario',
          'ACTIVE'::"RecordStatus"
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.report_definition
          WHERE code = $1
            AND tenant_id = public.sgp_current_tenant_uuid()
        )
        RETURNING id::text
      )
      SELECT id::text FROM inserted
      UNION ALL
      SELECT id::text
      FROM public.report_definition
      WHERE code = $1
        AND tenant_id = public.sgp_current_tenant_uuid()
      LIMIT 1
      `,
      [code, name, description],
    );
    return rows[0]?.id ?? '';
  }
}
