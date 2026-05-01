import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export const REMUNERATION_CEILING_KEYS = [
  'TETO_PREFEITURA',
  'TETO_VICE',
  'TETO_VEREADOR',
  'TETO_SECRETARIO',
] as const;
export type RemunerationCeilingKey = (typeof REMUNERATION_CEILING_KEYS)[number];

export const ATS_PARAMETER_KEYS = [
  'ATS_PERCENT_PER_YEAR',
  'TRIENIO_PERCENT_PER_PERIOD',
  'QUINQUENIO_PERCENT_PER_PERIOD',
  'SEXTA_PARTE_SERVICE_YEARS',
  'SEXTA_PARTE_FRACTION',
] as const;
export type AtsParameterKey = (typeof ATS_PARAMETER_KEYS)[number];

export class UpsertSystemParametersDto {
  @ApiProperty({
    description:
      'Map of system parameter keys and values persisted under the system namespace.',
  })
  @IsObject()
  values!: Record<string, unknown>;
}

export class UpsertGlobalParameterDto {
  @ApiPropertyOptional({
    description: 'Canonical global parameter value payload.',
  })
  @IsOptional()
  value?: unknown;
}

export class ToggleFeatureFlagDto {
  @ApiProperty()
  @IsBoolean()
  ativo!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpsertRemunerationCeilingDto {
  @ApiProperty({ enum: REMUNERATION_CEILING_KEYS })
  @IsIn(REMUNERATION_CEILING_KEYS)
  key!: RemunerationCeilingKey;

  @ApiProperty({
    description: 'Decimal monetary amount persisted as a string.',
  })
  @IsString()
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpsertAtsParameterDto {
  @ApiProperty({ enum: ATS_PARAMETER_KEYS })
  @IsIn(ATS_PARAMETER_KEYS)
  key!: AtsParameterKey;

  @ApiProperty({
    description: 'Decimal parameter value persisted as a string.',
  })
  @IsString()
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
