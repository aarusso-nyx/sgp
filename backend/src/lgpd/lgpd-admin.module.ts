import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { LgpdModule } from '../common/lgpd/lgpd.module';
import { DatabaseModule } from '../database/database.module';
import { LgpdDpoAdminController } from './dpo.controller';
import { LgpdDpoAdminService } from './dpo.service';
import { LgpdIncidentsController } from './incidents.controller';
import { LgpdSecurityIncidentService } from './incidents.service';
import { LgpdPublicPowerTreatmentController } from './public-power.controller';
import { LgpdPublicPowerTreatmentService } from './public-power.service';
import { LgpdRopaController } from './ropa.controller';
import { LgpdRopaService } from './ropa.service';

@Module({
  imports: [AuditModule, DatabaseModule, LgpdModule],
  controllers: [
    LgpdRopaController,
    LgpdIncidentsController,
    LgpdDpoAdminController,
    LgpdPublicPowerTreatmentController,
  ],
  providers: [
    LgpdRopaService,
    LgpdSecurityIncidentService,
    LgpdDpoAdminService,
    LgpdPublicPowerTreatmentService,
  ],
})
export class LgpdAdminModule {}
