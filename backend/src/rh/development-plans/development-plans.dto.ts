import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const DEVELOPMENT_PLAN_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;
export type DevelopmentPlanStatus = (typeof DEVELOPMENT_PLAN_STATUSES)[number];

export const DEVELOPMENT_PLAN_GOAL_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'BLOCKED',
  'CANCELLED',
] as const;
export type DevelopmentPlanGoalStatus =
  (typeof DEVELOPMENT_PLAN_GOAL_STATUSES)[number];

export class CreateDevelopmentPlanDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerEmployeeId?: string;

  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  objective?: string;
}

export class UpdateDevelopmentPlanDto {
  @ApiPropertyOptional({ enum: DEVELOPMENT_PLAN_STATUSES })
  @IsOptional()
  @IsIn(DEVELOPMENT_PLAN_STATUSES as readonly string[])
  status?: DevelopmentPlanStatus;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  objective?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  managerReview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerEmployeeId?: string;
}

export class CreateDevelopmentPlanGoalDto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateDevelopmentPlanGoalDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: DEVELOPMENT_PLAN_GOAL_STATUSES })
  @IsOptional()
  @IsIn(DEVELOPMENT_PLAN_GOAL_STATUSES as readonly string[])
  status?: DevelopmentPlanGoalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
