import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { LgpdModule } from '../common/lgpd/lgpd.module';
import { DatabaseModule } from '../database/database.module';
import { LgpdDsarAdminController } from './dsar.controller';
import { LgpdDsarAdminService } from './dsar.service';
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
    LgpdDsarAdminController,
    LgpdPublicPowerTreatmentController,
  ],
  providers: [
    LgpdRopaService,
    LgpdSecurityIncidentService,
    LgpdDpoAdminService,
    LgpdDsarAdminService,
    LgpdPublicPowerTreatmentService,
  ],
})
export class LgpdAdminModule {}
