import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHealthProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workLocationId!: string;

  @ApiProperty()
  @IsDateString()
  validFrom!: string;

  @ApiProperty()
  @IsDateString()
  validUntil!: string;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  responsibleDoctorCrm!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  responsibleDoctorName!: string;
}

export class CreateRiskManagementProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workLocationId!: string;

  @ApiProperty()
  @IsDateString()
  validFrom!: string;

  @ApiProperty()
  @IsDateString()
  validUntil!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleEngineerId?: string;
}

export class CreateProgramRevisionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  revisionReason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signedPdfUri?: string;

  @ApiPropertyOptional({ minLength: 64, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sha256?: string;
}

export class AddRequiredExamDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  medicalExamId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appliesToRoleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  periodicityMonthsOverride?: number;
}
