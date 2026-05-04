import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AvaliacaoController } from './avaliacao.controller';
import { AvaliacaoDataAccessService } from './avaliacao-data-access.service';
import { AvaliacaoService } from './avaliacao.service';
import { AvaliacaoProgressionSimulationService } from './progression-simulation.service';
import { CareerPlanRuntimeService } from './career-plan-runtime.service';
import { CareerPlanController } from './career-plan/career-plan.controller';
import { CareerPlanService } from './career-plan/career-plan.service';
import { EvaluationReportService } from './evaluation-report.service';
import { PerformanceEvaluationService } from './performance-evaluation.service';
import { ProbationController } from './probation.controller';
import { ProbationService } from './probation.service';
import { ProgressionController } from './progression/progression.controller';
import {
  EligibilityService,
  ProgressionApplyService,
  ProgressionSimulationService,
} from './progression/progression.service';
import { SalaryHistoryController } from './salary-history/salary-history.controller';
import { SalaryHistoryService } from './salary-history/salary-history.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    AvaliacaoController,
    CareerPlanController,
    ProbationController,
    ProgressionController,
    SalaryHistoryController,
  ],
  providers: [
    AvaliacaoDataAccessService,
    AvaliacaoService,
    CareerPlanRuntimeService,
    CareerPlanService,
    EvaluationReportService,
    PerformanceEvaluationService,
    AvaliacaoProgressionSimulationService,
    ProbationService,
    ProgressionSimulationService,
    EligibilityService,
    ProgressionApplyService,
    SalaryHistoryService,
  ],
  exports: [CareerPlanService, EligibilityService],
})
export class AvaliacaoModule {}
