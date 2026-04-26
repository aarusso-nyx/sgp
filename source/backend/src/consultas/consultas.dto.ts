import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
