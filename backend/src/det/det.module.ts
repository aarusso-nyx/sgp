import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { DetMessagesController } from './det.controller';
import { DetProjectionService } from './det.service';

@Module({
  imports: [AuditModule, DatabaseModule],
  controllers: [DetMessagesController],
  providers: [DetProjectionService],
  exports: [DetProjectionService],
})
export class DetModule {}
