import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateBiometricConsentDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  consentVersion!: string;

  @IsOptional()
  @IsDateString()
  consentAt?: string;
}

export class EnrollBiometricTemplateDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(['FINGERPRINT', 'PALM_VEIN'])
  kind!: 'FINGERPRINT' | 'PALM_VEIN';

  @IsString()
  @IsNotEmpty()
  sampleBase64!: string;

  @IsString()
  @IsNotEmpty()
  templateKmsKeyId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minimumQuality?: number;
}

export class MatchBiometricTemplateDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(['FINGERPRINT', 'PALM_VEIN'])
  kind!: 'FINGERPRINT' | 'PALM_VEIN';

  @IsString()
  @IsNotEmpty()
  sampleBase64!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @IsOptional()
  @IsUUID()
  timeRecordId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;
}
