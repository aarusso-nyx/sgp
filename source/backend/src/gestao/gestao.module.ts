import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import {
  JobPositionsController,
  MasterDataController,
} from './master-data/master-data.controller';
import { MasterDataService } from './master-data/master-data.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [MasterDataController, JobPositionsController],
  providers: [MasterDataService],
})
export class GestaoModule {}
