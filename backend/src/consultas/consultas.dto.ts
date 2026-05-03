import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FinancialRecordQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  funcionarioId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  competenciaAno?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  competenciaMes?: number;
}

export class FunctionalRecordQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  situacaoFuncionalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotacaoId?: string;
}

export class BlockedPaymentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  competenciaAno?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  competenciaMes?: number;
}

export class OperationalHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recurso?: string;
}

export class BusinessDaysQueryDto {
  @ApiProperty({
    description: 'Inclusive start date in ISO yyyy-mm-dd format.',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'Inclusive end date in ISO yyyy-mm-dd format.',
  })
  @IsDateString()
  endDate!: string;
}

export class BatimentoQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payrollRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  competenceYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  competenceMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
