import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
