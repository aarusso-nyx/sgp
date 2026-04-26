import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';

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
