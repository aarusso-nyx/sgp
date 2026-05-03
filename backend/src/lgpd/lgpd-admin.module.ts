import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { LgpdModule } from '../common/lgpd/lgpd.module';
import { DatabaseModule } from '../database/database.module';
import { LgpdIncidentsController } from './incidents.controller';
import { LgpdSecurityIncidentService } from './incidents.service';
import { LgpdRopaController } from './ropa.controller';
import { LgpdRopaService } from './ropa.service';

@Module({
  imports: [AuditModule, DatabaseModule, LgpdModule],
  controllers: [LgpdRopaController, LgpdIncidentsController],
  providers: [LgpdRopaService, LgpdSecurityIncidentService],
})
export class LgpdAdminModule {}
