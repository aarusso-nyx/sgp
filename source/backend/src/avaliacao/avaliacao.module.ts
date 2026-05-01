import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AvaliacaoController } from './avaliacao.controller';
import { AvaliacaoService } from './avaliacao.service';
import { CareerPlanController } from './career-plan/career-plan.controller';
import { CareerPlanService } from './career-plan/career-plan.service';
import { ProbationController } from './probation.controller';
import { ProbationService } from './probation.service';
import { SalaryHistoryController } from './salary-history/salary-history.controller';
import { SalaryHistoryService } from './salary-history/salary-history.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    AvaliacaoController,
    CareerPlanController,
    ProbationController,
    SalaryHistoryController,
  ],
  providers: [
    AvaliacaoService,
    CareerPlanService,
    ProbationService,
    SalaryHistoryService,
  ],
  exports: [CareerPlanService],
})
export class AvaliacaoModule {}
