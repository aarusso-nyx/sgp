import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ManagerialQueriesController } from './managerial-queries.controller';
import { ManagerialQueriesService } from './managerial-queries.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ManagerialQueriesController],
  providers: [ManagerialQueriesService],
})
export class ConsultasModule {}
