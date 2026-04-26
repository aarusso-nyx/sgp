import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AuditSearchController } from './audit-search/audit-search.controller';
import { AuditSearchService } from './audit-search/audit-search.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AuditSearchController],
  providers: [AuditSearchService],
})
export class AuditoriaModule {}
