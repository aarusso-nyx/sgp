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
import { RepDeviceController } from './rep-device/rep-device.controller';
import { RepDeviceService } from './rep-device/rep-device.service';
import { ApplyToTimeRecordService } from './rep-ingestion/apply-to-time-record.service';
import { DedupService } from './rep-ingestion/dedup.service';
import { AftParserService } from './rep-ingestion/parsers/aft-parser.service';
import { RepPStreamService } from './rep-ingestion/parsers/rep-p-stream.service';
import { RepIngestionController } from './rep-ingestion/rep-ingestion.controller';
import { RepIngestionService } from './rep-ingestion/rep-ingestion.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    WorkScheduleController,
    AssignmentController,
    TimeRecordController,
    TimesheetPeriodController,
    RepDeviceController,
    RepIngestionController,
  ],
  providers: [
    WorkScheduleService,
    AssignmentService,
    TimeRecordHashService,
    TimesheetPeriodService,
    RepDeviceService,
    AftParserService,
    RepPStreamService,
    DedupService,
    ApplyToTimeRecordService,
    RepIngestionService,
  ],
  exports: [
    WorkScheduleService,
    AssignmentService,
    TimeRecordHashService,
    TimesheetPeriodService,
    RepDeviceService,
    RepIngestionService,
  ],
})
export class PontoModule {}
