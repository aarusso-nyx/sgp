import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ProgressionEligibilityQueryDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  effectDate?: string;
}

export class ProgressionListQueryDto {
  @ApiPropertyOptional({
    enum: ['eligible', 'simulated', 'applied', 'revoked'],
  })
  @IsOptional()
  @IsIn(['eligible', 'simulated', 'applied', 'revoked'])
  status?: 'eligible' | 'simulated' | 'applied' | 'revoked';
}

export class ProgressionSimulationDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  effectDate!: string;

  @ApiPropertyOptional({
    enum: ['merit_horizontal', 'vertical_promotion'],
  })
  @IsOptional()
  @IsIn(['merit_horizontal', 'vertical_promotion'])
  progressionType?: 'merit_horizontal' | 'vertical_promotion';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetSalaryRangeLevelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  performanceEvaluationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  administrativeProcessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  earningDeductionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  appointmentAct?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;
}
