import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DayScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsOptional()
  @IsString()
  entryTime?: string;

  @IsOptional()
  @IsString()
  lunchOut?: string;

  @IsOptional()
  @IsString()
  lunchIn?: string;

  @IsOptional()
  @IsString()
  exitTime?: string;

  @IsInt()
  @Min(0)
  totalMinutes!: number;
}

export class WorkShiftDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsIn(['FIXED', 'FLEXIBLE', 'SHIFT_12X36', 'SHIFT_6X1', 'OTHER'])
  kind!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  daySchedules!: DayScheduleDto[];
}

export class CreateWorkScheduleDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0.01)
  weeklyHours!: number;

  @IsInt()
  @Min(0)
  toleranceMinutes!: number;

  @IsDateString()
  validFrom!: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkShiftDto)
  shifts!: WorkShiftDto[];
}

export class AssignWorkScheduleDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  workScheduleId!: string;

  @IsDateString()
  validFrom!: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class CreateTimeRecordDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  recordedAt!: string;

  @IsIn(['REP_P', 'REP_A', 'REP_C', 'MANUAL_ADJUSTMENT'])
  source!: string;

  @IsInt()
  @Min(1)
  nsr!: number;

  @IsOptional()
  @IsString()
  prevHash?: string | null;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}

export class OpenTimesheetPeriodDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  employeeIds!: string[];

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}

export class CreateHourBankDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(['CLT_INDIVIDUAL', 'CLT_COLETIVO', 'ESTATUTARIO'])
  regime!: string;

  @IsDateString()
  openedAt!: string;

  @IsDateString()
  expiresAt!: string;
}

export class AccrueHourBankDayDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  workDate!: string;

  @IsInt()
  @Min(0)
  workedMinutes!: number;

  @IsInt()
  @Min(0)
  expectedMinutes!: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  sourceTimeRecordIds?: string[];
}

export class CompensateHourBankDto {
  @IsUUID()
  hourBankId!: string;

  @IsDateString()
  workDate!: string;

  @IsInt()
  @Min(1)
  minutes!: number;
}

export class ManualHourBankAdjustmentDto {
  @IsUUID()
  hourBankId!: string;

  @IsDateString()
  workDate!: string;

  @IsInt()
  minutes!: number;
}

export class SettleHourBankDto {
  @IsUUID()
  payrollRunId!: string;

  @IsOptional()
  @IsUUID()
  overtimeEarningDeductionId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  competenceMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  competenceYear?: number;
}

export class CreateRepDeviceDto {
  @IsIn(['REP_P', 'REP_A', 'REP_C'])
  kind!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsString()
  @IsNotEmpty()
  employerTaxId!: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  @Length(64, 128)
  programHash?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'DECOMMISSIONED'])
  status?: string;
}

export class RepPStreamRecordDto {
  @IsInt()
  @Min(1)
  nsr!: number;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsString()
  employeeRegistration?: string;

  @IsOptional()
  @IsString()
  employeeCpf?: string;

  @IsDateString()
  recordedAt!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class CreateRepIngestionBatchDto {
  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepPStreamRecordDto)
  records?: RepPStreamRecordDto[];

  @IsOptional()
  @IsString()
  signature?: string;
}

export class CreateAfdExportDto {
  @IsUUID()
  repDeviceId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}

export class CreateAfdImportDto {
  @IsUUID()
  repDeviceId!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class ShiftPatternDayDto {
  @IsInt()
  @Min(0)
  dayIndex!: number;

  @IsBoolean()
  isWorking!: boolean;

  @IsOptional()
  @IsString()
  entryTime?: string;

  @IsOptional()
  @IsString()
  exitTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lunchMinutes?: number;

  @IsOptional()
  @IsBoolean()
  nightShiftFlag?: boolean;

  @IsOptional()
  @IsBoolean()
  hazardFlag?: boolean;
}

export class CreateShiftPatternDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  @Max(31)
  cycleDays!: number;

  @IsIn(['CLT_12X36', 'CLT_6X1', 'CLT_5X2', 'PLANTAO_24X72', 'CUSTOM'])
  kind!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShiftPatternDayDto)
  days!: ShiftPatternDayDto[];
}

export class AssignShiftPatternDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  shiftPatternId!: string;

  @IsDateString()
  anchorDate!: string;

  @IsDateString()
  validFrom!: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class UpdateShiftAssignmentDto {
  @IsOptional()
  @IsUUID()
  shiftPatternId?: string;

  @IsOptional()
  @IsDateString()
  anchorDate?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string | null;
}

export class ProjectRosterDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}

export class GenerateDutyRosterDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  employeeIds!: string[];

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
