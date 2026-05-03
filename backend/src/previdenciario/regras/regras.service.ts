import { Injectable, NotFoundException, Optional } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  CreateRetirementRuleDto,
  CreateRetirementSimulationDto,
  SimulateEc103AtividadeRiscoProfessorDto,
  SimulateEc103IdadeProgressivaDto,
  SimulateEc103Pedagio50Dto,
  SimulateEc103Pedagio100Dto,
  SimulateEc103PontosDto,
  UpdateRetirementRuleDto,
} from '../previdenciario.dto';
import {
  employeeRow,
  ensureDatabase,
  ruleRow,
  toRuleSummary,
  toSimulationSummary,
} from '../previdenciario.shared';
import {
  EmployeeRetirementRow,
  RetirementRuleRow,
  RetirementSimulationRow,
} from '../previdenciario.types';
import { AtividadeRiscoProfessorService } from '../transition-rules/atividade-risco-professor.service';
import { IdadeProgressivaService } from '../transition-rules/idade-progressiva.service';
import { Pedagio100Service } from '../transition-rules/pedagio100.service';
import { Pedagio50Service } from '../transition-rules/pedagio50.service';
import { PontosService } from '../transition-rules/pontos.service';
import { RegrasSimulationService } from './regras-simulation.service';

@Injectable()
export class RegrasService {
  private readonly simulationService: RegrasSimulationService;

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() simulationService?: RegrasSimulationService,
    @Optional() pedagio100Service?: Pedagio100Service,
    @Optional() pedagio50Service?: Pedagio50Service,
    @Optional() pontosService?: PontosService,
    @Optional() idadeProgressivaService?: IdadeProgressivaService,
    @Optional() atividadeRiscoProfessorService?: AtividadeRiscoProfessorService,
  ) {
    this.simulationService =
      simulationService ??
      new RegrasSimulationService(
        pedagio100Service,
        pedagio50Service,
        pontosService,
        idadeProgressivaService,
        atividadeRiscoProfessorService,
      );
  }

  async listRules() {
    ensureDatabase(this.databaseService);
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
    return rows.map((row) => toRuleSummary(row));
  }

  async createRule(input: CreateRetirementRuleDto) {
    ensureDatabase(this.databaseService);
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
    return toRuleSummary(rows[0]!);
  }

  async updateRule(id: string, input: UpdateRetirementRuleDto) {
    ensureDatabase(this.databaseService);
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
    return toRuleSummary(rows[0]);
  }

  async listSimulations() {
    ensureDatabase(this.databaseService);
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
    return rows.map((row) => toSimulationSummary(row));
  }

  async createSimulation(
    input: CreateRetirementSimulationDto,
    actorUsername?: string,
  ) {
    ensureDatabase(this.databaseService);
    const employee = await employeeRow(
      this.databaseService,
      input.funcionarioId,
    );
    const rule = await ruleRow(this.databaseService, input.regraId);
    const simulationData = this.evaluateSimulation(employee, rule, input);
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
    return toSimulationSummary(rows[0]!);
  }

  simulatePedagio100(input: SimulateEc103Pedagio100Dto) {
    return this.simulationService.simulatePedagio100(input);
  }

  simulatePedagio50(input: SimulateEc103Pedagio50Dto) {
    return this.simulationService.simulatePedagio50(input);
  }

  simulatePontos(input: SimulateEc103PontosDto) {
    return this.simulationService.simulatePontos(input);
  }

  simulateIdadeProgressiva(input: SimulateEc103IdadeProgressivaDto) {
    return this.simulationService.simulateIdadeProgressiva(input);
  }

  simulateAtividadeRiscoProfessor(
    input: SimulateEc103AtividadeRiscoProfessorDto,
  ) {
    return this.simulationService.simulateAtividadeRiscoProfessor(input);
  }

  evaluateSimulation(
    employee: EmployeeRetirementRow,
    rule: RetirementRuleRow,
    input: CreateRetirementSimulationDto,
  ) {
    return this.simulationService.evaluateSimulation(employee, rule, input);
  }
}
