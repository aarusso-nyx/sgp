import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class FaceFrameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1_500_000)
  imageBase64!: string;

  @IsOptional()
  @IsBoolean()
  blinkDetected?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  yawDegrees?: number;
}

export class CreateFaceConsentDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  consentVersion!: string;

  @IsOptional()
  @IsDateString()
  consentAt?: string;
}

export class EnrollFaceTemplateDto {
  @IsUUID()
  employeeId!: string;

  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => FaceFrameDto)
  frames!: FaceFrameDto[];

  @IsString()
  @IsNotEmpty()
  templateKmsKeyId!: string;
}

export class MatchFaceDto {
  @IsUUID()
  employeeId!: string;

  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => FaceFrameDto)
  frames!: FaceFrameDto[];

  @IsOptional()
  @IsUUID()
  timeRecordId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class FaceClockInDto {
  @IsUUID()
  employeeId!: string;

  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => FaceFrameDto)
  frames!: FaceFrameDto[];

  @IsDateString()
  occurredAt!: string;

  @IsString()
  @IsNotEmpty()
  deviceId!: string;
}

export class UpdateFaceThresholdDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold!: number;

  @IsBoolean()
  livenessRequired!: boolean;
}
