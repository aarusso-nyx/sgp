import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export enum HarmfulAgentKind {
  FISICO = 'FISICO',
  QUIMICO = 'QUIMICO',
  BIOLOGICO = 'BIOLOGICO',
  ERGONOMICO = 'ERGONOMICO',
  ACIDENTE = 'ACIDENTE',
}

export class CreateEnvironmentalExposureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  riskManagementProgramId!: string;

  @ApiProperty({ example: '01.01.001' })
  @IsString()
  @Matches(/^\d{2}\.\d{2}\.\d{3}$/)
  harmfulAgentCode!: string;

  @ApiProperty({ enum: HarmfulAgentKind })
  @IsEnum(HarmfulAgentKind)
  agentKind!: HarmfulAgentKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  intensityValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  intensityUnit?: string;

  @ApiProperty()
  @IsDateString()
  exposureStart!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exposureEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mitigatedByEpi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mitigatedByEpc?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  specialRetirementEligible?: boolean;
}

export class UpdateEnvironmentalExposureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riskManagementProgramId?: string;

  @ApiPropertyOptional({ example: '01.01.001' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\.\d{2}\.\d{3}$/)
  harmfulAgentCode?: string;

  @ApiPropertyOptional({ enum: HarmfulAgentKind })
  @IsOptional()
  @IsEnum(HarmfulAgentKind)
  agentKind?: HarmfulAgentKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  intensityValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  intensityUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exposureStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exposureEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mitigatedByEpi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mitigatedByEpc?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  specialRetirementEligible?: boolean;
}
