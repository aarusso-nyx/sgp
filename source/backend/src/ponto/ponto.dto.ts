import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
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
