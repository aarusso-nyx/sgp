import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  EC103_ATIVIDADE_RISCO_PROFESSOR_POPULATIONS,
  EC103_TRANSITION_RULES,
  RETIREMENT_GENDERS,
  type Ec103AtividadeRiscoProfessorPopulationInput,
  type Ec103TransitionRuleInput,
  type RetirementGenderInput,
} from './shared';

export class CreateRetirementRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fundamentoLegal!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  criteriosIdade?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  criteriosTempoContribuicao?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  criteriosCarencia?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vinculoAplicavel?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativa?: boolean;
}

export class UpdateRetirementRuleDto extends CreateRetirementRuleDto {}

export class CreateRetirementSimulationDto {
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
  dataReferencia!: string;

  @ApiPropertyOptional({ enum: EC103_TRANSITION_RULES })
  @IsOptional()
  @IsIn(EC103_TRANSITION_RULES)
  regraTransicao?: Ec103TransitionRuleInput;

  @ApiPropertyOptional({ enum: RETIREMENT_GENDERS })
  @IsOptional()
  @IsIn(RETIREMENT_GENDERS)
  sexo?: RetirementGenderInput;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioContribuicao?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioServicoPublico?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioCargoAtual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReformaAnos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReferenciaAnos?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  professor?: boolean;

  @ApiPropertyOptional({
    enum: EC103_ATIVIDADE_RISCO_PROFESSOR_POPULATIONS,
  })
  @IsOptional()
  @IsIn(EC103_ATIVIDADE_RISCO_PROFESSOR_POPULATIONS)
  populacaoAtividadeRiscoProfessor?: Ec103AtividadeRiscoProfessorPopulationInput;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioCarreira?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioMagisterio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoCarreiraReformaAnos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ingressoCarreiraAteReforma?: boolean;
}

export class SimulateEc103Pedagio100Dto {
  @ApiProperty({ enum: RETIREMENT_GENDERS })
  @IsIn(RETIREMENT_GENDERS)
  sexo!: RetirementGenderInput;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataNascimento!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataInicioContribuicao!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataReferencia!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioServicoPublico?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioCargoAtual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReformaAnos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReferenciaAnos?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  professor?: boolean;
}

export class SimulateEc103Pedagio50Dto {
  @ApiProperty({ enum: RETIREMENT_GENDERS })
  @IsIn(RETIREMENT_GENDERS)
  sexo!: RetirementGenderInput;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataInicioContribuicao!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataReferencia!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReformaAnos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReferenciaAnos?: number;
}

export class SimulateEc103PontosDto {
  @ApiProperty({ enum: RETIREMENT_GENDERS })
  @IsIn(RETIREMENT_GENDERS)
  sexo!: RetirementGenderInput;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataNascimento!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataInicioContribuicao!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataReferencia!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioServicoPublico?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioCargoAtual?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  professor?: boolean;
}

export class SimulateEc103IdadeProgressivaDto {
  @ApiProperty({ enum: RETIREMENT_GENDERS })
  @IsIn(RETIREMENT_GENDERS)
  sexo!: RetirementGenderInput;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataNascimento!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataInicioContribuicao!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataReferencia!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReferenciaAnos?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  professor?: boolean;
}

export class SimulateEc103AtividadeRiscoProfessorDto {
  @ApiProperty({ enum: EC103_ATIVIDADE_RISCO_PROFESSOR_POPULATIONS })
  @IsIn(EC103_ATIVIDADE_RISCO_PROFESSOR_POPULATIONS)
  populacao!: Ec103AtividadeRiscoProfessorPopulationInput;

  @ApiProperty({ enum: RETIREMENT_GENDERS })
  @IsIn(RETIREMENT_GENDERS)
  sexo!: RetirementGenderInput;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataNascimento!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataInicioContribuicao!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  dataReferencia!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioServicoPublico?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioCargoAtual?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioCarreira?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dataInicioMagisterio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoContribuicaoReformaAnos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tempoCarreiraReformaAnos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ingressoCarreiraAteReforma?: boolean;
}
