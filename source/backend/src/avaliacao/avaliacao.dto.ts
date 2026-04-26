import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PERFORMANCE_EVALUATION_STATUSES = [
  'RASCUNHO',
  'SUBMETIDA',
  'APROVADA',
  'REPROVADA',
] as const;

export const PROGRESSION_KINDS = [
  'MERITO',
  'TITULARIDADE',
  'JUDICIAL',
  'CORRECAO',
] as const;

export type PerformanceEvaluationStatusInput =
  (typeof PERFORMANCE_EVALUATION_STATUSES)[number];
export type ProgressionKindInput = (typeof PROGRESSION_KINDS)[number];

export class EvaluationCriteriaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  criterio!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  nota!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class CreatePerformanceEvaluationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  periodo!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  nota!: number;

  @ApiProperty({ type: () => [EvaluationCriteriaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriteriaDto)
  criterios!: EvaluationCriteriaDto[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  avaliadorId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataAvaliacao!: string;

  @ApiPropertyOptional({ enum: PERFORMANCE_EVALUATION_STATUSES })
  @IsOptional()
  @IsIn(PERFORMANCE_EVALUATION_STATUSES)
  status?: PerformanceEvaluationStatusInput;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class UpdatePerformanceEvaluationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  nota?: number;

  @ApiPropertyOptional({ type: () => [EvaluationCriteriaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriteriaDto)
  criterios?: EvaluationCriteriaDto[];

  @ApiPropertyOptional({ enum: PERFORMANCE_EVALUATION_STATUSES })
  @IsOptional()
  @IsIn(PERFORMANCE_EVALUATION_STATUSES)
  status?: PerformanceEvaluationStatusInput;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataAvaliacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class CreateMeritProgressionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avaliacaoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenciaOrigemId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  referenciaDestinoId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataVigencia!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  atoNomeacao?: string;

  @ApiProperty({ enum: PROGRESSION_KINDS, default: 'MERITO' })
  @IsIn(PROGRESSION_KINDS)
  tipo!: ProgressionKindInput;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justificativa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aprovadoPorId?: string;
}

export class SalarySimulationAdjustmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descricao!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  percentual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valorFixo?: string;
}

export class CreateSalarySimulationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cenario!: string;

  @ApiPropertyOptional({ type: () => [SalarySimulationAdjustmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalarySimulationAdjustmentDto)
  ajustes?: SalarySimulationAdjustmentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  contexto?: Record<string, unknown>;
}

export class CreateCareerPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  funcionarioId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  versao!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataVigencia!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  niveis?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  referencias?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  ativo?: boolean;
}

export class UpdateCareerPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  versao?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataVigencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  niveis?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  referencias?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  ativo?: boolean;
}

export class GenerateAvaliacaoReportDto {
  @ApiPropertyOptional({ example: 'PDF' })
  @IsOptional()
  @IsString()
  formato?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotacaoId?: string;
}
