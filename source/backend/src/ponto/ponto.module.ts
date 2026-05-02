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
import { AfdController } from './afd/afd.controller';
import { AfdGeneratorService } from './afd/afd-generator.service';
import { AfdImporterService } from './afd/afd-importer.service';
import { DutyRosterController } from './duty-roster/duty-roster.controller';
import { DutyRosterService } from './duty-roster/duty-roster.service';
import { RosterProjectorService } from './duty-roster/roster-projector.service';
import { HourBankAccrualService } from './hour-bank/hour-bank-accrual.service';
import { HourBankCompensationService } from './hour-bank/hour-bank-compensation.service';
import { HourBankController } from './hour-bank/hour-bank.controller';
import { HourBankService } from './hour-bank/hour-bank.service';
import { HourBankSettlementService } from './hour-bank/hour-bank-settlement.service';
import { JustificationController } from './justification/justification.controller';
import { JustificationPayrollBridgeService } from './justification/justification-payroll-bridge.service';
import { JustificationService } from './justification/justification.service';
import { JustificationWorkflowService } from './justification/justification-workflow.service';
import { PayrollBridgeController } from './payroll-bridge/payroll-bridge.controller';
import { PayrollBridgeService } from './payroll-bridge/payroll-bridge.service';
import { PayrollLineBuilderService } from './payroll-bridge/payroll-line-builder.service';
import { TimesheetAggregatorService } from './payroll-bridge/timesheet-aggregator.service';
import { ShiftPatternController } from './shift-pattern/shift-pattern.controller';
import { ShiftPatternService } from './shift-pattern/shift-pattern.service';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [
    WorkScheduleController,
    AssignmentController,
    TimeRecordController,
    TimesheetPeriodController,
    RepDeviceController,
    RepIngestionController,
    AfdController,
    ShiftPatternController,
    DutyRosterController,
    HourBankController,
    JustificationController,
    PayrollBridgeController,
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
    AfdGeneratorService,
    AfdImporterService,
    ShiftPatternService,
    RosterProjectorService,
    DutyRosterService,
    HourBankService,
    HourBankAccrualService,
    HourBankCompensationService,
    HourBankSettlementService,
    JustificationService,
    JustificationWorkflowService,
    JustificationPayrollBridgeService,
    TimesheetAggregatorService,
    PayrollLineBuilderService,
    PayrollBridgeService,
  ],
  exports: [
    WorkScheduleService,
    AssignmentService,
    TimeRecordHashService,
    TimesheetPeriodService,
    RepDeviceService,
    RepIngestionService,
    AfdGeneratorService,
    AfdImporterService,
    ShiftPatternService,
    RosterProjectorService,
    DutyRosterService,
    HourBankService,
    HourBankAccrualService,
    HourBankCompensationService,
    HourBankSettlementService,
    JustificationService,
    JustificationWorkflowService,
    JustificationPayrollBridgeService,
    TimesheetAggregatorService,
    PayrollLineBuilderService,
    PayrollBridgeService,
  ],
})
export class PontoModule {}
