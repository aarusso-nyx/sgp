import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ConsultasModule } from '../consultas/consultas.module';
import { DatabaseModule } from '../database/database.module';
import { EmployeesController } from './employees/employees.controller';
import { AccumulationService } from './employees/accumulation.service';
import { EmployeeAbonoPermanenciaService } from './employees/employee-abono-permanencia.service';
import { EmployeeCadastralChangesService } from './employees/employee-cadastral-changes.service';
import { EmployeeContractRegimeService } from './employees/employee-contract-regime.service';
import { EmployeeLifecycleService } from './employees/employee-lifecycle.service';
import { EmployeeReferenceDataService } from './employees/employee-reference-data.service';
import { EmployeeRegistryService } from './employees/employee-registry.service';
import { EmployeeVersionService } from './employees/employee-version.service';
import { EmployeesService } from './employees/employees.service';
import { HistoryService } from './employees/history.service';
import { ServiceTimeService } from './employees/service-time.service';
import {
  EmployeeRhWorkflowsController,
  RhWorkflowsController,
} from './workflows/rh-workflows.controller';
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

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, ConsultasModule],
  controllers: [
    EmployeesController,
    RhWorkflowsController,
    EmployeeRhWorkflowsController,
    VacationController,
    MedicalLeaveController,
    LeavesController,
    EmployeeTransferController,
    OrganicDefinitionController,
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
    EmployeeTransferService,
    OrganicDefinitionService,
  ],
})
export class RhModule {}
