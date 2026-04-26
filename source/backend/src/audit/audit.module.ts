import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AuditController } from './audit.controller';
import { AuditQueryService } from './audit-query.service';
import { AuditService } from './audit.service';
import { AuditWriterService } from './audit-writer.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AuditController],
  providers: [AuditService, AuditQueryService, AuditWriterService],
  exports: [AuditService],
})
export class AuditModule {}
