import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
