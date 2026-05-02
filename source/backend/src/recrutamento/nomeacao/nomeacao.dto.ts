import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateNomeacaoDto {
  @IsUUID()
  concursoId!: string;

  @IsUUID()
  vagaId!: string;

  @IsInt()
  @Min(1)
  count!: number;

  @IsString()
  @IsNotEmpty()
  atoAdministrativo!: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

export class CreateConvocacaoDto {
  @IsIn(['PUBLICACAO_OFICIAL', 'EMAIL', 'POSTAL'])
  channel!: 'PUBLICACAO_OFICIAL' | 'EMAIL' | 'POSTAL';

  @IsOptional()
  @IsString()
  evidenceRef?: string;
}
