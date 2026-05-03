import { BadRequestException, Injectable, Optional } from '@nestjs/common';

import {
  CreateRetirementSimulationDto,
  Ec103TransitionRuleInput,
  RetirementGenderInput,
  SimulateEc103AtividadeRiscoProfessorDto,
  SimulateEc103IdadeProgressivaDto,
  SimulateEc103Pedagio50Dto,
  SimulateEc103Pedagio100Dto,
  SimulateEc103PontosDto,
} from '../previdenciario.dto';
import { asObject, diffYears, numberish } from '../previdenciario.shared';
import {
  EmployeeRetirementRow,
  RetirementRuleRow,
} from '../previdenciario.types';
import { AtividadeRiscoProfessorService } from '../transition-rules/atividade-risco-professor.service';
import { IdadeProgressivaService } from '../transition-rules/idade-progressiva.service';
import { Pedagio100Service } from '../transition-rules/pedagio100.service';
import { Pedagio50Service } from '../transition-rules/pedagio50.service';
import { PontosService } from '../transition-rules/pontos.service';

export interface Ec103SimulationResult {
  eligible: boolean;
  observed: {
    ageYears?: number;
    contributionYears: number;
  };
  rule: string;
  legalBasis: string;
  referenceDate: string;
  criteriaMet: string[];
  missing: Record<string, number>;
}

@Injectable()
export class RegrasSimulationService {
  private readonly pedagio100Service: Pedagio100Service;
  private readonly pedagio50Service: Pedagio50Service;
  private readonly pontosService: PontosService;
  private readonly idadeProgressivaService: IdadeProgressivaService;
  private readonly atividadeRiscoProfessorService: AtividadeRiscoProfessorService;

  constructor(
    @Optional() pedagio100Service?: Pedagio100Service,
    @Optional() pedagio50Service?: Pedagio50Service,
    @Optional() pontosService?: PontosService,
    @Optional() idadeProgressivaService?: IdadeProgressivaService,
    @Optional() atividadeRiscoProfessorService?: AtividadeRiscoProfessorService,
  ) {
    this.pedagio100Service = pedagio100Service ?? new Pedagio100Service();
    this.pedagio50Service = pedagio50Service ?? new Pedagio50Service();
    this.pontosService = pontosService ?? new PontosService();
    this.idadeProgressivaService =
      idadeProgressivaService ?? new IdadeProgressivaService();
    this.atividadeRiscoProfessorService =
      atividadeRiscoProfessorService ?? new AtividadeRiscoProfessorService();
  }

  simulatePedagio100(input: SimulateEc103Pedagio100Dto) {
    return this.pedagio100Service.evaluate({
      gender: input.sexo,
      birthDate: input.dataNascimento,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao,
      publicServiceStartDate:
        input.dataInicioServicoPublico ?? input.dataInicioContribuicao,
      currentPositionStartDate:
        input.dataInicioCargoAtual ??
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao,
      contributionYearsAtReform: input.tempoContribuicaoReformaAnos,
      teacher: input.professor,
    });
  }

  simulatePedagio50(input: SimulateEc103Pedagio50Dto) {
    return this.pedagio50Service.evaluate({
      gender: input.sexo,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao,
      contributionYearsAtReform: input.tempoContribuicaoReformaAnos,
      contributionYearsAtReference: input.tempoContribuicaoReferenciaAnos,
    });
  }

  simulatePontos(input: SimulateEc103PontosDto) {
    return this.pontosService.evaluate({
      gender: input.sexo,
      birthDate: input.dataNascimento,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao,
      publicServiceStartDate:
        input.dataInicioServicoPublico ?? input.dataInicioContribuicao,
      currentPositionStartDate:
        input.dataInicioCargoAtual ??
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao,
      teacher: input.professor,
    });
  }

  simulateIdadeProgressiva(input: SimulateEc103IdadeProgressivaDto) {
    return this.idadeProgressivaService.evaluate({
      gender: input.sexo,
      birthDate: input.dataNascimento,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao,
      contributionYearsAtReference: input.tempoContribuicaoReferenciaAnos,
      teacher: input.professor,
    });
  }

  simulateAtividadeRiscoProfessor(
    input: SimulateEc103AtividadeRiscoProfessorDto,
  ) {
    return this.atividadeRiscoProfessorService.evaluate({
      population: input.populacao,
      gender: input.sexo,
      birthDate: input.dataNascimento,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao,
      publicServiceStartDate:
        input.dataInicioServicoPublico ?? input.dataInicioContribuicao,
      currentPositionStartDate:
        input.dataInicioCargoAtual ??
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao,
      careerStartDate: input.dataInicioCarreira ?? input.dataInicioContribuicao,
      teachingStartDate:
        input.dataInicioMagisterio ??
        input.dataInicioCarreira ??
        input.dataInicioContribuicao,
      contributionYearsAtReform: input.tempoContribuicaoReformaAnos,
      careerYearsAtReform: input.tempoCarreiraReformaAnos,
      enteredCareerByReform: input.ingressoCarreiraAteReforma,
    });
  }

  evaluateSimulation(
    employee: EmployeeRetirementRow,
    rule: RetirementRuleRow,
    input: CreateRetirementSimulationDto,
  ) {
    const transition = this.transitionRule(input, rule);
    if (transition === 'EC103_PEDAGIO_100') {
      return this.simulateEc103Pedagio100(employee, input);
    }
    if (transition === 'EC103_PEDAGIO_50') {
      return this.simulateEc103Pedagio50(employee, input);
    }
    if (transition === 'EC103_PONTOS') {
      return this.simulateEc103Pontos(employee, input);
    }
    if (transition === 'EC103_IDADE_PROGRESSIVA') {
      return this.simulateEc103IdadeProgressiva(employee, input);
    }
    if (transition === 'EC103_ATIVIDADE_RISCO_PROFESSOR') {
      return this.simulateEc103AtividadeRiscoProfessor(employee, input);
    }
    return this.simulateGeneric(employee, rule, input);
  }

  private transitionRule(
    input: CreateRetirementSimulationDto,
    rule: RetirementRuleRow,
  ): Ec103TransitionRuleInput | undefined {
    const ageCriteria = asObject(rule.age_criteria);
    const transition = input.regraTransicao ?? ageCriteria.transitionRule;
    if (
      transition === 'EC103_PEDAGIO_100' ||
      transition === 'EC103_PEDAGIO_50' ||
      transition === 'EC103_PONTOS' ||
      transition === 'EC103_IDADE_PROGRESSIVA' ||
      transition === 'EC103_ATIVIDADE_RISCO_PROFESSOR'
    ) {
      return transition;
    }
    return undefined;
  }

  private simulateGeneric(
    employee: EmployeeRetirementRow,
    rule: RetirementRuleRow,
    input: CreateRetirementSimulationDto,
  ) {
    const referenceDate = input.dataReferencia;
    const ageYears = diffYears(employee.birth_date, referenceDate);
    const contributionYears = diffYears(employee.hired_on, referenceDate);
    const ageCriteria = asObject(rule.age_criteria);
    const contributionCriteria = asObject(rule.contribution_time_criteria);
    const minAge = numberish(ageCriteria.minYears);
    const minContribution = numberish(contributionCriteria.minYears);
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

  private simulateEc103Pedagio100(
    employee: EmployeeRetirementRow,
    input: CreateRetirementSimulationDto,
  ) {
    const gender = this.requireGender(input);
    const result = this.pedagio100Service.evaluate({
      gender,
      birthDate: input.dataNascimento ?? employee.birth_date,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao ?? employee.hired_on,
      publicServiceStartDate:
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      currentPositionStartDate:
        input.dataInicioCargoAtual ??
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      contributionYearsAtReform: input.tempoContribuicaoReformaAnos,
      teacher: input.professor,
    });
    return this.toEc103Simulation(employee, result);
  }

  private simulateEc103Pedagio50(
    employee: EmployeeRetirementRow,
    input: CreateRetirementSimulationDto,
  ) {
    const gender = this.requireGender(input);
    const result = this.pedagio50Service.evaluate({
      gender,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao ?? employee.hired_on,
      contributionYearsAtReform: input.tempoContribuicaoReformaAnos,
      contributionYearsAtReference: input.tempoContribuicaoReferenciaAnos,
    });
    return this.toEc103Simulation(employee, result);
  }

  private simulateEc103Pontos(
    employee: EmployeeRetirementRow,
    input: CreateRetirementSimulationDto,
  ) {
    const gender = this.requireGender(input);
    const result = this.pontosService.evaluate({
      gender,
      birthDate: input.dataNascimento ?? employee.birth_date,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao ?? employee.hired_on,
      publicServiceStartDate:
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      currentPositionStartDate:
        input.dataInicioCargoAtual ??
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      teacher: input.professor,
    });
    return this.toEc103Simulation(employee, result);
  }

  private simulateEc103IdadeProgressiva(
    employee: EmployeeRetirementRow,
    input: CreateRetirementSimulationDto,
  ) {
    const gender = this.requireGender(input);
    const result = this.idadeProgressivaService.evaluate({
      gender,
      birthDate: input.dataNascimento ?? employee.birth_date,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao ?? employee.hired_on,
      contributionYearsAtReference: input.tempoContribuicaoReferenciaAnos,
      teacher: input.professor,
    });
    return this.toEc103Simulation(employee, result);
  }

  private simulateEc103AtividadeRiscoProfessor(
    employee: EmployeeRetirementRow,
    input: CreateRetirementSimulationDto,
  ) {
    const gender = this.requireGender(input);
    if (!input.populacaoAtividadeRiscoProfessor) {
      throw new BadRequestException(
        'Population is required for EC 103 risk activity or teacher simulation',
      );
    }
    const result = this.atividadeRiscoProfessorService.evaluate({
      population: input.populacaoAtividadeRiscoProfessor,
      gender,
      birthDate: input.dataNascimento ?? employee.birth_date,
      referenceDate: input.dataReferencia,
      contributionStartDate: input.dataInicioContribuicao ?? employee.hired_on,
      publicServiceStartDate:
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      currentPositionStartDate:
        input.dataInicioCargoAtual ??
        input.dataInicioServicoPublico ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      careerStartDate:
        input.dataInicioCarreira ??
        input.dataInicioMagisterio ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      teachingStartDate:
        input.dataInicioMagisterio ??
        input.dataInicioCarreira ??
        input.dataInicioContribuicao ??
        employee.hired_on,
      contributionYearsAtReform: input.tempoContribuicaoReformaAnos,
      careerYearsAtReform: input.tempoCarreiraReformaAnos,
      enteredCareerByReform: input.ingressoCarreiraAteReforma,
    });
    return this.toEc103Simulation(employee, result);
  }

  private requireGender(
    input: CreateRetirementSimulationDto,
  ): RetirementGenderInput {
    if (!input.sexo) {
      throw new BadRequestException('Gender is required for EC 103 simulation');
    }
    return input.sexo;
  }

  private toEc103Simulation(
    employee: EmployeeRetirementRow,
    result: Ec103SimulationResult,
  ) {
    return {
      resultado: {
        elegivel: result.eligible,
        idadeAnos: result.observed.ageYears,
        tempoContribuicao: result.observed.contributionYears,
        proventoEstimado: Number(
          (result.observed.contributionYears * 120).toFixed(2),
        ),
        regraTransicao: result.rule,
        fundamentoLegal: result.legalBasis,
      },
      detalhe: {
        referencia: result.referenceDate,
        criteriosAtendidos: result.criteriaMet,
        pendencias: result.missing,
        ec103: result,
        cpf: employee.cpf,
      },
    };
  }
}
