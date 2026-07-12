import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SgpStynxAuditModule } from '../stynx/sgp-stynx-audit.module';
import { AuditController } from './audit.controller';
import { AuditQueryService } from './audit-query.service';
import { AuditService } from './audit.service';

const sgpStynxAuditModule = SgpStynxAuditModule.forRoot();

@Module({
  imports: [AuthModule, DatabaseModule, sgpStynxAuditModule],
  controllers: [AuditController],
  providers: [AuditService, AuditQueryService],
  exports: [AuditService],
})
export class AuditModule {}
