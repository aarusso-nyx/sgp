import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const RECRUITMENT_HIRING_TYPES = [
  'EFETIVO',
  'COMISSIONADO',
  'TERCEIRIZADO',
  'ESTAGIO',
] as const;

export const RECRUITMENT_CANDIDATE_STATUSES = [
  'PENDENTE',
  'APROVADO',
  'REPROVADO',
] as const;

export type RecruitmentHiringTypeInput =
  (typeof RECRUITMENT_HIRING_TYPES)[number];
export type RecruitmentCandidateStatusInput =
  (typeof RECRUITMENT_CANDIDATE_STATUSES)[number];

export class RecruitmentRequestedFunctionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  funcaoId?: string;

  @ApiProperty({ enum: RECRUITMENT_HIRING_TYPES })
  @IsString()
  @IsIn(RECRUITMENT_HIRING_TYPES)
  tipoContratacao!: RecruitmentHiringTypeInput;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantidadeVagas!: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requisitos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  turnoId?: string;
}

export class CreateRecruitmentRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  solicitanteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotacaoId?: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  motivo!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justificativa!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataEntrada!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataLimite?: string;

  @ApiProperty({ type: () => [RecruitmentRequestedFunctionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecruitmentRequestedFunctionDto)
  funcoesRequisitadas!: RecruitmentRequestedFunctionDto[];
}

export class RecruitmentCandidateAttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pessoaId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  curriculoS3Key?: string;
}

export class AttachRecruitmentCandidatesDto {
  @ApiProperty({ type: () => [RecruitmentCandidateAttachmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecruitmentCandidateAttachmentDto)
  candidatos!: RecruitmentCandidateAttachmentDto[];
}

export class UpdateRecruitmentCandidateDto {
  @ApiProperty({ enum: RECRUITMENT_CANDIDATE_STATUSES })
  @IsString()
  @IsIn(RECRUITMENT_CANDIDATE_STATUSES)
  situacao!: RecruitmentCandidateStatusInput;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentarioAnalise?: string;
}
