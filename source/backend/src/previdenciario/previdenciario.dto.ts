import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PENSION_COMPENSATION_STATUSES = [
  'RASCUNHO',
  'SOLICITADA',
  'APROVADA',
  'REPROVADA',
  'LIQUIDADA',
] as const;

export const RECERTIFICATION_TYPES = [
  'APOSENTADO',
  'PENSIONISTA',
  'PENSIONISTA_UNIVERSITARIO',
] as const;

export const RECERTIFICATION_STATUSES = [
  'PENDENTE',
  'RECADASTRADO',
  'PROXIMO_VENCIMENTO',
  'VENCIDO',
  'BLOQUEADO',
] as const;

export const EXTERNAL_LIFE_PROOF_CHANNELS = [
  'PORTAL_COLABORADOR',
  'PREFEITURA_PUBLICA',
  'GOV_BR',
] as const;

export type PensionCompensationStatusInput =
  (typeof PENSION_COMPENSATION_STATUSES)[number];
export type RecertificationTypeInput = (typeof RECERTIFICATION_TYPES)[number];
export type RecertificationStatusInput =
  (typeof RECERTIFICATION_STATUSES)[number];
export type ExternalLifeProofChannelInput =
  (typeof EXTERNAL_LIFE_PROOF_CHANNELS)[number];

export class CreateRetirementRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fundamentoLegal!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  criteriosIdade?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  criteriosTempoContribuicao?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  criteriosCarencia?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vinculoAplicavel?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativa?: boolean;
}

export class UpdateRetirementRuleDto extends CreateRetirementRuleDto {}

export class CreateRetirementSimulationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regraId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataReferencia!: string;
}

export class CreateRetirementGrantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regraId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataConcessao!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fundamento!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  atoNomeacao!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  concedidaPorId?: string;
}

export class CreatePensionCompensationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  funcionarioId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certidaoReferencia?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regimeOrigem!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  valor!: string;

  @ApiPropertyOptional({ enum: PENSION_COMPENSATION_STATUSES })
  @IsOptional()
  @IsIn(PENSION_COMPENSATION_STATUSES)
  status?: PensionCompensationStatusInput;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class UpdatePensionCompensationDto {
  @ApiPropertyOptional({ enum: PENSION_COMPENSATION_STATUSES })
  @IsOptional()
  @IsIn(PENSION_COMPENSATION_STATUSES)
  status?: PensionCompensationStatusInput;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class CreatePensionGrantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  funcionarioInstituidorId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nomeBeneficiario!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cpfBeneficiario?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentesco?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tipoBeneficio!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tipoRateio!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cotaParte!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  formaReajuste!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  natureza!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataConcessao!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataCessacao?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fundamento!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class CreateContributionTimeCertificateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  periodoInicio!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  periodoFim!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orgaoEmitente!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  atoEmissao!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emitidaPorId?: string;
}

export class CreatePrevidentiaryDeclarationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emitidaPorId?: string;
}

export class CreateRecertificationCampaignDto {
  @ApiProperty({ enum: RECERTIFICATION_TYPES })
  @IsIn(RECERTIFICATION_TYPES)
  tipo!: RecertificationTypeInput;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  cicloInicio!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  cicloFim!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filtro?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativa?: boolean;
}

export class CreateRecertificationBeneficiaryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campanhaId?: string;

  @ApiProperty({ enum: RECERTIFICATION_TYPES })
  @IsIn(RECERTIFICATION_TYPES)
  tipo!: RecertificationTypeInput;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataProxima!: string;

  @ApiPropertyOptional({ enum: RECERTIFICATION_STATUSES })
  @IsOptional()
  @IsIn(RECERTIFICATION_STATUSES)
  status?: RecertificationStatusInput;
}

export class CreateRecertificationRecordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiarioId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  data!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  operadorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dadosSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comprovanteStorageKey?: string;
}

export class CreateExternalLifeProofDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiarioId!: string;

  @ApiProperty({ enum: EXTERNAL_LIFE_PROOF_CHANNELS })
  @IsIn(EXTERNAL_LIFE_PROOF_CHANNELS)
  canal!: ExternalLifeProofChannelInput;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  data!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  autenticacao?: Record<string, unknown>;
}

export class CreateBeneficiaryContactHistoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiarioId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  data!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  usuarioId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class GeneratePrevidenciarioOutputDto {
  @ApiPropertyOptional({ example: 'PDF' })
  @IsOptional()
  @IsString()
  formato?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  competencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campanhaId?: string;
}
