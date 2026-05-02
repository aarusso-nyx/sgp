import {
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class PayrollSimulationOverridesDto {
  @IsOptional()
  @IsNumberString()
  baseSalary?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  dependentCount?: number;

  @IsOptional()
  @IsUUID()
  rubricId?: string;

  @IsOptional()
  @IsNumberString()
  rubricAmount?: string;

  @IsOptional()
  @IsNumberString()
  rubricQuantity?: string;
}

export class RunPayrollSimulationDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  employmentLinkId!: string;

  @IsDateString()
  competence!: string;

  @IsOptional()
  overrides?: PayrollSimulationOverridesDto;
}
