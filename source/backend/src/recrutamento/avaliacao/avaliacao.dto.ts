import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProvaDto {
  @IsUUID()
  concursoId!: string;

  @IsIn(['OBJETIVA', 'DISCURSIVA', 'PRATICA', 'TITULOS'])
  kind!: 'OBJETIVA' | 'DISCURSIVA' | 'PRATICA' | 'TITULOS';

  @IsDateString()
  appliedAt!: string;

  @IsNumberString()
  weight!: string;
}

export class CreateQuestaoDto {
  @IsInt()
  @Min(1)
  number!: number;

  @IsString()
  @IsNotEmpty()
  statement!: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class CreateGabaritoDto {
  @IsIn(['PRELIMINARY', 'FINAL'])
  status!: 'PRELIMINARY' | 'FINAL';

  @IsObject()
  answers!: Record<string, string>;
}

export class RecordRespostaDto {
  @IsUUID()
  inscricaoId!: string;

  @IsUUID()
  questaoId!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;
}

export class RecordRespostasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecordRespostaDto)
  respostas!: RecordRespostaDto[];
}

export class CreateRecursoDto {
  @IsUUID()
  provaId!: string;

  @IsUUID()
  questaoId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class DecideRecursoDto {
  @IsIn(['UPHELD', 'REJECTED'])
  status!: 'UPHELD' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  parecer!: string;
}
