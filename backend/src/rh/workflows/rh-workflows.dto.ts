import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RhWorkflowMutationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dependentId?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @ApiPropertyOptional({ maxLength: 14 })
  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  relationship?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  employer?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  functionalStatusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobFunctionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  absenceReasonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vacationTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salaryReferenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transitBenefitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toWorkLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  benefitCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficiaryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficiaryCpf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courtProcessNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveOn?: string;

  @ApiPropertyOptional({ minimum: 1900, maximum: 2200 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  year?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  daysCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  absenceDays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workedDays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deductionAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deductionPercent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  levelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  levelDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adjustmentAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rgIssuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pisPasep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  voterRegistration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  incomeTaxDependent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RhRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceFileName?: string;

  @ApiPropertyOptional({ minimum: 1900, maximum: 2200 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  year?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
