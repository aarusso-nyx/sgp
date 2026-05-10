import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StynxEsocialModule } from '../integrations/stynx-esocial';
import {
  JobPositionsController,
  MasterDataController,
} from './master-data/master-data.controller';
import {
  JobPositionAdminController,
  SalaryRangeController,
  SalaryRangeLevelController,
} from './master-data/job-position.controller';
import { JobPositionService } from './master-data/job-position.service';
import { MasterDataService } from './master-data/master-data.service';
import {
  SalaryRangeLevelService,
  SalaryRangeService,
} from './master-data/salary-range.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, StynxEsocialModule],
  controllers: [
    MasterDataController,
    JobPositionsController,
    JobPositionAdminController,
    SalaryRangeController,
    SalaryRangeLevelController,
  ],
  providers: [
    MasterDataService,
    JobPositionService,
    SalaryRangeService,
    SalaryRangeLevelService,
  ],
})
export class GestaoModule {}
