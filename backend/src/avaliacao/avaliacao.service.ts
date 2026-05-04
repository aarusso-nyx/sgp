import { Injectable } from '@nestjs/common';

import {
  CreateCareerPlanDto,
  CreateMeritProgressionDto,
  CreatePerformanceEvaluationDto,
  CreateSalarySimulationDto,
  GenerateAvaliacaoReportDto,
  UpdateCareerPlanDto,
  UpdatePerformanceEvaluationDto,
} from './avaliacao.dto';
import { CareerPlanRuntimeService } from './career-plan-runtime.service';
import { EvaluationReportService } from './evaluation-report.service';
import { PerformanceEvaluationService } from './performance-evaluation.service';
import { AvaliacaoProgressionSimulationService } from './progression-simulation.service';
import type {
  CareerPlanSummary,
  MeritProgressionSummary,
  PerformanceEvaluationSummary,
  SalarySimulationSummary,
} from './avaliacao.types';

export type {
  CareerPlanSummary,
  MeritProgressionSummary,
  PerformanceEvaluationSummary,
  SalarySimulationSummary,
} from './avaliacao.types';

@Injectable()
export class AvaliacaoService {
  constructor(
    private readonly performanceEvaluations: PerformanceEvaluationService,
    private readonly progressionSimulation: AvaliacaoProgressionSimulationService,
    private readonly careerPlans: CareerPlanRuntimeService,
    private readonly reports: EvaluationReportService,
  ) {}

  listPerformanceEvaluations(): Promise<PerformanceEvaluationSummary[]> {
    return this.performanceEvaluations.list();
  }

  createPerformanceEvaluation(
    input: CreatePerformanceEvaluationDto,
  ): Promise<PerformanceEvaluationSummary> {
    return this.performanceEvaluations.create(input);
  }

  updatePerformanceEvaluation(
    id: string,
    input: UpdatePerformanceEvaluationDto,
  ): Promise<PerformanceEvaluationSummary> {
    return this.performanceEvaluations.update(id, input);
  }

  listProgressions(): Promise<MeritProgressionSummary[]> {
    return this.progressionSimulation.listProgressions();
  }

  createProgression(
    input: CreateMeritProgressionDto,
  ): Promise<MeritProgressionSummary> {
    return this.progressionSimulation.createProgression(input);
  }

  listSimulations(): Promise<SalarySimulationSummary[]> {
    return this.progressionSimulation.listSimulations();
  }

  createSimulation(
    input: CreateSalarySimulationDto,
    actorUsername?: string,
  ): Promise<SalarySimulationSummary> {
    return this.progressionSimulation.createSimulation(input, actorUsername);
  }

  listCareerPlans(): Promise<CareerPlanSummary[]> {
    return this.careerPlans.list();
  }

  createCareerPlan(input: CreateCareerPlanDto): Promise<CareerPlanSummary> {
    return this.careerPlans.create(input);
  }

  updateCareerPlan(
    id: string,
    input: UpdateCareerPlanDto,
  ): Promise<CareerPlanSummary> {
    return this.careerPlans.update(id, input);
  }

  requestEvaluationSheet(
    evaluationId: string,
    input: GenerateAvaliacaoReportDto,
  ) {
    return this.reports.requestEvaluationSheet(evaluationId, input);
  }

  requestCycleReport(periodLabel: string, input: GenerateAvaliacaoReportDto) {
    return this.reports.requestCycleReport(periodLabel, input);
  }
}
