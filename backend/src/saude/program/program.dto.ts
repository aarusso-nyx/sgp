import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHealthProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workLocationId!: string;

  @ApiProperty()
  @IsDateString()
  validFrom!: string;

  @ApiProperty()
  @IsDateString()
  validUntil!: string;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  responsibleDoctorCrm!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  responsibleDoctorName!: string;
}

export class CreateRiskManagementProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workLocationId!: string;

  @ApiProperty()
  @IsDateString()
  validFrom!: string;

  @ApiProperty()
  @IsDateString()
  validUntil!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleEngineerId?: string;
}

export class CreateProgramRevisionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  revisionReason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signedPdfUri?: string;

  @ApiPropertyOptional({ minLength: 64, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sha256?: string;
}

export class AddRequiredExamDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  medicalExamId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appliesToRoleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  periodicityMonthsOverride?: number;
}

export class CreateCipaCommitteeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workLocationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  electionCallRef!: string;

  @ApiProperty()
  @IsDateString()
  mandateStart!: string;

  @ApiProperty()
  @IsDateString()
  mandateEnd!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AddCipaMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({
    enum: [
      'EMPLOYER_REPRESENTATIVE',
      'EMPLOYEE_REPRESENTATIVE',
      'PRESIDENT',
      'VICE_PRESIDENT',
      'SECRETARY',
    ],
  })
  @IsIn([
    'EMPLOYER_REPRESENTATIVE',
    'EMPLOYEE_REPRESENTATIVE',
    'PRESIDENT',
    'VICE_PRESIDENT',
    'SECRETARY',
  ])
  role!:
    | 'EMPLOYER_REPRESENTATIVE'
    | 'EMPLOYEE_REPRESENTATIVE'
    | 'PRESIDENT'
    | 'VICE_PRESIDENT'
    | 'SECRETARY';

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUBSTITUTE', 'REMOVED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'SUBSTITUTE', 'REMOVED'])
  status?: 'ACTIVE' | 'SUBSTITUTE' | 'REMOVED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  electedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  appointedAt?: string;
}

export class AddCipaMinuteDto {
  @ApiProperty()
  @IsDateString()
  meetingAt!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  subject!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  minutesUri!: string;

  @ApiProperty({ minLength: 64, maxLength: 64 })
  @IsString()
  @MaxLength(64)
  sha256!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
