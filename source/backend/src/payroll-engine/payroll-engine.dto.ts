import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const PAYROLL_CALCULATION_MODES = ['TOTAL', 'RETROACTIVE'] as const;
export type PayrollCalculationMode = (typeof PAYROLL_CALCULATION_MODES)[number];

export class PayrollCalculationRequestDto {
  @ApiProperty()
  @IsUUID()
  payrollRunId!: string;

  @ApiPropertyOptional({ enum: PAYROLL_CALCULATION_MODES, default: 'TOTAL' })
  @IsOptional()
  @IsIn(PAYROLL_CALCULATION_MODES)
  mode?: PayrollCalculationMode;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  competenceYear?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  competenceMonth?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  requestedBy?: string;
}
