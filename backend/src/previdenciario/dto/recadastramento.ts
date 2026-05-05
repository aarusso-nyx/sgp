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

import {
  EXTERNAL_LIFE_PROOF_CHANNELS,
  RECERTIFICATION_STATUSES,
  RECERTIFICATION_TYPES,
  type ExternalLifeProofChannelInput,
  type RecertificationStatusInput,
  type RecertificationTypeInput,
} from './shared';

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
