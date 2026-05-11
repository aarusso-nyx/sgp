import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StynxEsocialModule } from '../integrations/stynx-esocial';
import { AsoAttachmentService } from './aso/aso-attachment.service';
import { AsoController } from './aso/aso.controller';
import { AsoPortalController } from './aso/aso-portal.controller';
import { AsoService } from './aso/aso.service';
import { CatEmissionService } from './cat/cat-emission.service';
import { WorkAccidentController } from './cat/work-accident.controller';
import { WorkAccidentService } from './cat/work-accident.service';
import { EpiController } from './epi/epi.controller';
import { EpiDeliveryService } from './epi/epi-delivery.service';
import { EpiInventoryService } from './epi/epi-inventory.service';
import { EnvironmentalExposureController } from './exposure/environmental-exposure.controller';
import { EnvironmentalExposureService } from './exposure/environmental-exposure.service';
import { PericiaAppointmentWorkflowService } from './pericia-appointment-workflow.service';
import { PericiaController } from './pericia.controller';
import { PericiaMedicalRecordWorkflowService } from './pericia-medical-record-workflow.service';
import { PericiaReplicationWorkflowService } from './pericia-replication-workflow.service';
import { PericiaService } from './pericia.service';
import { PppController } from './ppp/ppp.controller';
import { PppService } from './ppp/ppp.service';
import { CipaCommitteeService } from './program/cipa-committee.service';
import { HealthProgramService } from './program/health-program.service';
import { ProgramController } from './program/program.controller';
import { ProgramRevisionService } from './program/program-revision.service';
import { RiskManagementProgramService } from './program/risk-management-program.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, StynxEsocialModule],
  controllers: [
    PericiaController,
    AsoController,
    AsoPortalController,
    WorkAccidentController,
    ProgramController,
    EnvironmentalExposureController,
    EpiController,
    PppController,
  ],
  providers: [
    PericiaService,
    PericiaAppointmentWorkflowService,
    PericiaMedicalRecordWorkflowService,
    PericiaReplicationWorkflowService,
    AsoService,
    AsoAttachmentService,
    CatEmissionService,
    WorkAccidentService,
    CipaCommitteeService,
    HealthProgramService,
    RiskManagementProgramService,
    ProgramRevisionService,
    EnvironmentalExposureService,
    EpiInventoryService,
    EpiDeliveryService,
    PppService,
  ],
})
export class SaudeModule {}
