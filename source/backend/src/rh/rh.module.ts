import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { EmployeesController } from './employees/employees.controller';
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

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    EmployeesController,
    RhWorkflowsController,
    EmployeeRhWorkflowsController,
    VacationController,
    MedicalLeaveController,
    LeavesController,
    EmployeeTransferController,
  ],
  providers: [
    EmployeesService,
    HistoryService,
    ServiceTimeService,
    RhWorkflowsService,
    VacationService,
    MedicalLeaveService,
    LeavesService,
    EmployeeTransferService,
  ],
})
export class RhModule {}
