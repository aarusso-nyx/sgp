import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AgendarPosseDto {
  @IsUUID()
  nomeacaoId!: string;

  @IsDateString()
  posseAt!: string;

  @IsUUID()
  lotacaoId!: string;
}

export class CancelarPosseDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ProrrogarExercicioDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
