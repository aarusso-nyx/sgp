import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class RegisterWorkAccidentDto {
  @IsString()
  employeeId!: string;

  @IsDateString()
  accidentAt!: string;

  @IsIn(['TIPICO', 'TRAJETO', 'DOENCA_OCUPACIONAL'])
  accidentType!: 'TIPICO' | 'TRAJETO' | 'DOENCA_OCUPACIONAL';

  @IsString()
  locationText!: string;

  @IsString()
  bodyPartCode!: string;

  @IsString()
  agentCauseCode!: string;

  @IsOptional()
  @IsString()
  witnessText?: string;

  @IsIn(['LEVE', 'GRAVE', 'FATAL'])
  severity!: 'LEVE' | 'GRAVE' | 'FATAL';

  @IsOptional()
  @IsDateString()
  deathAt?: string;
}

export class EmitCatDto {
  @IsIn(['INICIAL', 'REABERTURA', 'OBITO'])
  catKind!: 'INICIAL' | 'REABERTURA' | 'OBITO';

  @IsOptional()
  @IsDateString()
  emittedAt?: string;

  @IsString()
  doctorCrm!: string;

  @IsString()
  doctorName!: string;

  @IsOptional()
  @IsBoolean()
  internment?: boolean;

  @IsOptional()
  @IsDateString()
  leaveUntil?: string;
}

export class ReportWorkAccidentDeathDto {
  @IsDateString()
  deathAt!: string;

  @IsString()
  doctorCrm!: string;

  @IsString()
  doctorName!: string;

  @IsOptional()
  @IsBoolean()
  internment?: boolean;

  @IsOptional()
  @IsDateString()
  leaveUntil?: string;
}
