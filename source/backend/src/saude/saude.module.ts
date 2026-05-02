import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AsoAttachmentService } from './aso/aso-attachment.service';
import { AsoController } from './aso/aso.controller';
import { AsoPortalController } from './aso/aso-portal.controller';
import { AsoService } from './aso/aso.service';
import { CatEmissionService } from './cat/cat-emission.service';
import { WorkAccidentController } from './cat/work-accident.controller';
import { WorkAccidentService } from './cat/work-accident.service';
import { PericiaController } from './pericia.controller';
import { PericiaService } from './pericia.service';
import { HealthProgramService } from './program/health-program.service';
import { ProgramController } from './program/program.controller';
import { ProgramRevisionService } from './program/program-revision.service';
import { RiskManagementProgramService } from './program/risk-management-program.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    PericiaController,
    AsoController,
    AsoPortalController,
    WorkAccidentController,
    ProgramController,
  ],
  providers: [
    PericiaService,
    AsoService,
    AsoAttachmentService,
    CatEmissionService,
    WorkAccidentService,
    HealthProgramService,
    RiskManagementProgramService,
    ProgramRevisionService,
  ],
})
export class SaudeModule {}
