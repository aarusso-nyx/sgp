import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBiometricConsentDto {
  @IsUUID()
  candidatoId!: string;

  @IsString()
  @IsNotEmpty()
  consentVersion!: string;

  @IsString()
  @IsNotEmpty()
  signedDocRef!: string;
}

export class CaptureBiometricDto {
  @IsUUID()
  candidatoId!: string;

  @IsIn(['FINGERPRINT', 'FACE'])
  kind!: 'FINGERPRINT' | 'FACE';

  @IsString()
  @IsNotEmpty()
  @MaxLength(1_500_000)
  sampleBase64!: string;

  @IsString()
  @IsNotEmpty()
  captureDeviceRef!: string;

  @IsDateString()
  retentionUntil!: string;

  @IsString()
  @IsNotEmpty()
  templateKmsKeyId!: string;
}

export class MatchBiometricDto {
  @IsUUID()
  candidatoId!: string;

  @IsIn(['FINGERPRINT', 'FACE'])
  kind!: 'FINGERPRINT' | 'FACE';

  @IsString()
  @IsNotEmpty()
  @MaxLength(1_500_000)
  sampleBase64!: string;

  @IsOptional()
  @IsUUID()
  examSessionId?: string;

  @IsOptional()
  @IsNumberString()
  threshold?: string;
}
