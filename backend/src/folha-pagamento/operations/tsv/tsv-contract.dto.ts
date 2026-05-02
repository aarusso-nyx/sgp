import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTsvContractDto {
  @IsDateString()
  effectiveDate!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  monthlyAmount?: string | number;

  @IsOptional()
  weeklyHours?: string | number;

  @IsOptional()
  @IsString()
  workplaceId?: string;

  @IsOptional()
  @IsString()
  supervisorEmployeeId?: string | null;

  @IsOptional()
  @IsString()
  educationInstitution?: string | null;

  @IsOptional()
  @IsString()
  internshipPlanUri?: string | null;
}
