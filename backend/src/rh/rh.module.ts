import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ConsultasModule } from '../consultas/consultas.module';
import { DatabaseModule } from '../database/database.module';
import { StynxEsocialModule } from '../integrations/stynx-esocial';
import { EmployeesController } from './employees/employees.controller';
import { AccumulationService } from './employees/accumulation.service';
import { EmployeeAbonoPermanenciaService } from './employees/employee-abono-permanencia.service';
import { EmployeeCadastralChangesService } from './employees/employee-cadastral-changes.service';
import { EmployeeContractRegimeService } from './employees/employee-contract-regime.service';
import { EmployeeLifecycleService } from './employees/employee-lifecycle.service';
import { EmployeeMeritLeaveController } from './employees/employee-merit-leave.controller';
import { EmployeeMeritLeaveService } from './employees/employee-merit-leave.service';
import { EmployeeReferenceDataService } from './employees/employee-reference-data.service';
import { EmployeeRegistryService } from './employees/employee-registry.service';
import { EmployeeVersionService } from './employees/employee-version.service';
import { EmployeesService } from './employees/employees.service';
import { HistoryService } from './employees/history.service';
import { ServiceTimeService } from './employees/service-time.service';
import { RhWorkflowLeavesController } from './workflows/afastamentos/afastamentos.controller';
import { UnionContributionsWorkflowController } from './workflows/contribuicoes-sindicais/contribuicoes-sindicais.controller';
import { BenefitDependentsWorkflowController } from './workflows/dependentes-beneficio/dependentes-beneficio.controller';
import { ExercisesWorkflowController } from './workflows/exercicios/exercicios.controller';
import { AlimoniesWorkflowController } from './workflows/pensoes-alimenticias/pensoes-alimenticias.controller';
import { RhWorkflowProfessionalExperiencesController } from './workflows/professional-experiences/professional-experiences.controller';
import { RhWorkflowProcessFunctionsController } from './workflows/processos-funcao/processos-funcao.controller';
import { RhWorkflowProcessesController } from './workflows/processos/processos.controller';
import { TransitBenefitsWorkflowController } from './workflows/vales-transporte/vales-transporte.controller';
import { RhWorkflowsService } from './workflows/rh-workflows.service';
import { VacationController } from './workflows/vacation/vacation.controller';
import { VacationService } from './workflows/vacation/vacation.service';
import { MedicalLeaveController } from './workflows/medical-leave/medical-leave.controller';
import { MedicalLeaveService } from './workflows/medical-leave/medical-leave.service';
import { LeavesController } from './workflows/leaves/leaves.controller';
import { LeavesService } from './workflows/leaves/leaves.service';
import { EmployeeTransferController } from './employee-transfer/employee-transfer.controller';
import { EmployeeTransferService } from './employee-transfer/employee-transfer.service';
import { OrganicDefinitionController } from './organic-definitions/organic-definition.controller';
import { OrganicDefinitionService } from './organic-definitions/organic-definition.service';
import { TrainingCertificationsController } from './certifications/certifications.controller';
import { TrainingCertificationsService } from './certifications/certifications.service';
import { DevelopmentPlansController } from './development-plans/development-plans.controller';
import { DevelopmentPlansService } from './development-plans/development-plans.service';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    AuditModule,
    ConsultasModule,
    StynxEsocialModule,
  ],
  controllers: [
    EmployeesController,
    RhWorkflowLeavesController,
    RhWorkflowProfessionalExperiencesController,
    RhWorkflowProcessesController,
    RhWorkflowProcessFunctionsController,
    BenefitDependentsWorkflowController,
    UnionContributionsWorkflowController,
    ExercisesWorkflowController,
    AlimoniesWorkflowController,
    TransitBenefitsWorkflowController,
    VacationController,
    MedicalLeaveController,
    LeavesController,
    EmployeeMeritLeaveController,
    EmployeeTransferController,
    OrganicDefinitionController,
    TrainingCertificationsController,
    DevelopmentPlansController,
  ],
  providers: [
    EmployeesService,
    AccumulationService,
    EmployeeAbonoPermanenciaService,
    EmployeeCadastralChangesService,
    EmployeeContractRegimeService,
    EmployeeLifecycleService,
    EmployeeReferenceDataService,
    EmployeeRegistryService,
    EmployeeVersionService,
    HistoryService,
    ServiceTimeService,
    RhWorkflowsService,
    VacationService,
    MedicalLeaveService,
    LeavesService,
    EmployeeMeritLeaveService,
    EmployeeTransferService,
    OrganicDefinitionService,
    TrainingCertificationsService,
    DevelopmentPlansService,
  ],
})
export class RhModule {}
