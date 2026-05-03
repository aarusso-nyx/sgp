import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const LGPD_PUBLIC_POWER_TREATMENT_STATUSES = [
  'REGISTERED',
  'UNDER_REVIEW',
  'SUSPENDED',
  'RETIRED',
] as const;

export type LgpdPublicPowerTreatmentStatus =
  (typeof LGPD_PUBLIC_POWER_TREATMENT_STATUSES)[number];

export class LgpdPublicPowerTreatmentListQueryDto {
  @IsOptional()
  @IsIn(LGPD_PUBLIC_POWER_TREATMENT_STATUSES)
  status?: LgpdPublicPowerTreatmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;
}

export class CreateLgpdPublicPowerTreatmentDto {
  @IsOptional()
  @IsUUID()
  ropaEntryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purpose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  legalBasisReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleArea?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  evidenceRefs?: string[];

  @IsOptional()
  @IsIn(LGPD_PUBLIC_POWER_TREATMENT_STATUSES)
  status?: LgpdPublicPowerTreatmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateLgpdPublicPowerTreatmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purpose?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  legalBasisReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleArea?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  evidenceRefs?: string[];

  @IsOptional()
  @IsIn(LGPD_PUBLIC_POWER_TREATMENT_STATUSES)
  status?: LgpdPublicPowerTreatmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
