import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PERICIA_APPOINTMENT_STATUSES = [
  'COMPARECEU',
  'NAO_COMPARECEU',
  'CANCELADO',
] as const;

export const PERICIA_REPORT_DECISIONS = ['APROVAR', 'REPROVAR'] as const;

export type PericiaAppointmentStatusInput =
  (typeof PERICIA_APPOINTMENT_STATUSES)[number];
export type PericiaReportDecisionInput =
  (typeof PERICIA_REPORT_DECISIONS)[number];

export class InstructorAttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  s3Key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tipo!: string;
}

export class SchedulePericiaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  especialidadeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agendaId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  janelaId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  data!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  hora!: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefoneContato?: string;

  @ApiPropertyOptional({ type: () => InstructorAttachmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InstructorAttachmentDto)
  anexoInstrutor?: InstructorAttachmentDto;
}

export class UpdatePericiaAppointmentDto {
  @ApiProperty({ enum: PERICIA_APPOINTMENT_STATUSES })
  @IsString()
  @IsIn(PERICIA_APPOINTMENT_STATUSES)
  status!: PericiaAppointmentStatusInput;
}

export class PericiaTeamMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  profissionalId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  papel!: string;
}

export class CreateMedicalLeaveDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tipoAvaliacao!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficioPrevidenciario?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivoAfastamentoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidId?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  diasConcedidos!: number;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataInicio!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataFim!: string;
}

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  agendamentoId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  medicoId!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  motivo!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hda?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  exameFisico?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  diagnostico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acaoPericial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipoLaudo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  situacaoLaudo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidPrincipalId?: string;

  @ApiPropertyOptional({ type: () => [PericiaTeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PericiaTeamMemberDto)
  equipeMultiprofissional?: PericiaTeamMemberDto[];

  @ApiPropertyOptional({ type: () => CreateMedicalLeaveDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMedicalLeaveDto)
  licenca?: CreateMedicalLeaveDto;
}

export class ValidateMedicalRecordDto {
  @ApiProperty({ enum: PERICIA_REPORT_DECISIONS })
  @IsString()
  @IsIn(PERICIA_REPORT_DECISIONS)
  decisao!: PericiaReportDecisionInput;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  coordenadorId!: string;
}

export class ReplicateMedicalRecordDto {
  @ApiProperty({ type: () => [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  matriculasAlvo!: string[];
}
