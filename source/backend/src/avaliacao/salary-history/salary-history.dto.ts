import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class MassAdjustmentScopeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  careerPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salaryRangeId?: string;
}

export class MassAdjustmentDto {
  @ApiProperty({
    description: 'Percent adjustment rate, for example 5.25 for 5.25%.',
  })
  @IsNumberString()
  percentual!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  vigenciaInicio!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  leiReferencia!: string;

  @ApiPropertyOptional({
    enum: ['reajuste_data_base', 'correcao', 'reestruturacao'],
  })
  @IsOptional()
  @IsIn(['reajuste_data_base', 'correcao', 'reestruturacao'])
  motivo?: 'reajuste_data_base' | 'correcao' | 'reestruturacao';

  @ApiProperty({ type: () => MassAdjustmentScopeDto })
  @IsObject()
  @ValidateNested()
  @Type(() => MassAdjustmentScopeDto)
  escopo!: MassAdjustmentScopeDto;
}
