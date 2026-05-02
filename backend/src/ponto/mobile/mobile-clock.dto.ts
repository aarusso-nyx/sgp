import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class MobileClockInDto {
  @IsUUID()
  employeeId!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @IsNumber()
  @Min(0)
  gpsPrecisionM!: number;

  @IsDateString()
  occurredAt!: string;

  @IsBoolean()
  mockLocation!: boolean;

  @IsString()
  deviceId!: string;

  @IsOptional()
  @IsIn(['IOS', 'ANDROID'])
  platform?: 'IOS' | 'ANDROID';
}

export class RegisterMobileDeviceDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  deviceId!: string;

  @IsIn(['IOS', 'ANDROID'])
  platform!: 'IOS' | 'ANDROID';

  @IsString()
  publicKey!: string;
}

export class CreateMobileGeolocationConsentDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  consentVersion!: string;

  @IsOptional()
  @IsDateString()
  consentAt?: string;
}

export class GeofencePointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;
}

export class UpdateWorkLocationGeofenceDto {
  @IsUUID()
  workLocationId!: string;

  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => GeofencePointDto)
  polygon!: GeofencePointDto[];
}

export type MobileClockInResult =
  | 'ACCEPTED'
  | 'OUT_OF_FENCE'
  | 'MOCK_DETECTED'
  | 'IMPOSSIBLE_VELOCITY'
  | 'LOW_PRECISION'
  | 'NO_GEOLOCATION_CONSENT';
