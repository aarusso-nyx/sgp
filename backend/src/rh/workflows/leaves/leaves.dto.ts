import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export type GeneralLeaveReason =
  | 'maternidade'
  | 'empresa_cidada_extension'
  | 'paternidade'
  | 'paternidade_empresa_cidada'
  | 'adotante'
  | 'premio'
  | 'capacitacao'
  | 'interesse_particular'
  | 'conjuge'
  | 'mandato_classista'
  | 'atividade_politica'
  | 'mandato_eletivo'
  | 'falecimento'
  | 'doacao_sangue'
  | 'pessoa_familia';

export class CreateLeaveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiProperty()
  @IsString()
  reason!: GeneralLeaveReason;

  @ApiProperty()
  @IsString()
  startsOn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supportingDocumentRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
