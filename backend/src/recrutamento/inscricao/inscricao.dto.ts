import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CandidateAddressDto {
  @IsString()
  @IsNotEmpty()
  street!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  postalCode!: string;
}

export class CandidateDto {
  @Matches(/^\d{11}$/)
  cpf!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsDateString()
  birthDate!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ValidateNested()
  @Type(() => CandidateAddressDto)
  address!: CandidateAddressDto;
}

export class ExemptionRequestDto {
  @IsIn(['NONE', 'CADUNICO', 'BONE_MARROW_DONOR'])
  kind!: 'NONE' | 'CADUNICO' | 'BONE_MARROW_DONOR';

  @IsOptional()
  @IsString()
  evidenceRef?: string;

  @IsOptional()
  @IsString()
  nis?: string;

  @IsOptional()
  @IsString()
  donorRegistry?: string;
}

export class CreateInscricaoDto {
  @IsUUID()
  vagaId!: string;

  @ValidateNested()
  @Type(() => CandidateDto)
  candidate!: CandidateDto;

  @IsObject()
  requirements!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  quotaSelfDeclaration?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => ExemptionRequestDto)
  exemption!: ExemptionRequestDto;

  @IsBoolean()
  lgpdConsent!: boolean;

  @IsString()
  @IsNotEmpty()
  lgpdConsentVersion!: string;
}
