import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { BatimentoController } from './batimento.controller';
import { BatimentoService } from './batimento.service';
import { BusinessDaysController } from './business-days.controller';
import { BusinessDaysService } from './business-days.service';
import { ManagerialQueriesController } from './managerial-queries.controller';
import { ManagerialQueriesService } from './managerial-queries.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    ManagerialQueriesController,
    BusinessDaysController,
    BatimentoController,
  ],
  providers: [ManagerialQueriesService, BusinessDaysService, BatimentoService],
  exports: [BusinessDaysService],
})
export class ConsultasModule {}
