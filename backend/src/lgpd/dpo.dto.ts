import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const LGPD_DPO_DESIGNATION_STATUSES = [
  'ACTIVE',
  'UNDER_REVIEW',
  'REPLACED',
] as const;

export type LgpdDpoDesignationStatus =
  (typeof LGPD_DPO_DESIGNATION_STATUSES)[number];

export class CreateLgpdDpoDesignationDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(180)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  channelUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  officeHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  postalAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  designationAct?: string;

  @IsOptional()
  @IsDateString()
  designatedAt?: string;

  @IsOptional()
  @IsIn(LGPD_DPO_DESIGNATION_STATUSES)
  status?: LgpdDpoDesignationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateLgpdDpoDesignationDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  channelUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  officeHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  postalAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  designationAct?: string | null;

  @IsOptional()
  @IsDateString()
  designatedAt?: string | null;

  @IsOptional()
  @IsIn(LGPD_DPO_DESIGNATION_STATUSES)
  status?: LgpdDpoDesignationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
