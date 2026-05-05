import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  PENSION_COMPENSATION_STATUSES,
  type PensionCompensationStatusInput,
} from './shared';

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
