import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const ASO_KINDS = [
  'ADMISSIONAL',
  'PERIODICO',
  'RETORNO_TRABALHO',
  'MUDANCA_FUNCAO',
  'DEMISSIONAL',
] as const;

export const ASO_CONCLUSIONS = ['APTO', 'INAPTO', 'APTO_RESTRICAO'] as const;
export const EXAM_TYPES = [
  'CLINICO',
  'LABORATORIAL',
  'COMPLEMENTAR',
  'IMAGEM',
] as const;

export class CreateMedicalExamDto {
  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ enum: EXAM_TYPES })
  @IsString()
  @IsIn(EXAM_TYPES)
  examType!: (typeof EXAM_TYPES)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatoryAdmission?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatoryPeriodic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  periodicityMonths?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ScheduleAsoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ enum: ASO_KINDS })
  @IsString()
  @IsIn(ASO_KINDS)
  asoKind!: (typeof ASO_KINDS)[number];

  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;
}

export class PerformAsoDto {
  @ApiProperty()
  @IsDateString()
  performedAt!: string;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  doctorCrm!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  doctorName!: string;

  @ApiProperty({ enum: ASO_CONCLUSIONS })
  @IsString()
  @IsIn(ASO_CONCLUSIONS)
  conclusion!: (typeof ASO_CONCLUSIONS)[number];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  restrictionText?: string;
}

export class AttachAsoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileUri!: string;

  @ApiProperty({ minLength: 64, maxLength: 64 })
  @IsString()
  @MaxLength(64)
  sha256!: string;

  @ApiProperty({ default: 'application/pdf' })
  @IsString()
  @IsIn(['application/pdf'])
  mime!: 'application/pdf';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  encryptedAtRest?: boolean;
}
