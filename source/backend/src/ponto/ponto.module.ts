import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AssignmentController } from './assignment/assignment.controller';
import { AssignmentService } from './assignment/assignment.service';
import { TimeRecordController } from './time-record/time-record.controller';
import { TimeRecordHashService } from './time-record/time-record-hash.service';
import { TimesheetPeriodController } from './timesheet-period/timesheet-period.controller';
import { TimesheetPeriodService } from './timesheet-period/timesheet-period.service';
import { WorkScheduleController } from './work-schedule/work-schedule.controller';
import { WorkScheduleService } from './work-schedule/work-schedule.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    WorkScheduleController,
    AssignmentController,
    TimeRecordController,
    TimesheetPeriodController,
  ],
  providers: [
    WorkScheduleService,
    AssignmentService,
    TimeRecordHashService,
    TimesheetPeriodService,
  ],
  exports: [
    WorkScheduleService,
    AssignmentService,
    TimeRecordHashService,
    TimesheetPeriodService,
  ],
})
export class PontoModule {}
