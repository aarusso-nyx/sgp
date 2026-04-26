import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import {
  EmployeeRhWorkflowsController,
  RhWorkflowsController,
} from './workflows/rh-workflows.controller';
import { RhWorkflowsService } from './workflows/rh-workflows.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    EmployeesController,
    RhWorkflowsController,
    EmployeeRhWorkflowsController,
  ],
  providers: [EmployeesService, RhWorkflowsService],
})
export class RhModule {}
