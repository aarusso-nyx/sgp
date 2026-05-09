import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const INTERNATIONAL_TRANSFER_MECHANISMS = [
  'ADEQUACY_DECISION',
  'STANDARD_CONTRACTUAL_CLAUSES',
  'SPECIFIC_CONTRACTUAL_CLAUSES',
  'GLOBAL_CORPORATE_RULES',
  'LEGAL_COOPERATION',
  'PUBLIC_POLICY',
  'CONSENT',
  'CONTRACT_EXECUTION',
  'LEGAL_CLAIM',
  'VITAL_INTEREST',
  'ANPD_AUTHORIZATION',
] as const;

export const INTERNATIONAL_TRANSFER_STATUSES = [
  'DRAFT',
  'DPO_REVIEW',
  'ACTIVE',
  'CLOSED',
  'REJECTED',
] as const;

export type InternationalTransferMechanism =
  (typeof INTERNATIONAL_TRANSFER_MECHANISMS)[number];
export type InternationalTransferStatus =
  (typeof INTERNATIONAL_TRANSFER_STATUSES)[number];

export class InternationalTransferListQueryDto {
  @IsOptional()
  @IsIn(INTERNATIONAL_TRANSFER_STATUSES)
  status?: InternationalTransferStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;
}

export class CreateInternationalTransferDto {
  @IsOptional()
  @IsUUID()
  ropaEntryId?: string;

  @IsString()
  @MaxLength(120)
  flowKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  originCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  originRegion?: string;

  @IsString()
  @MaxLength(3)
  destinationCountry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinationRegion?: string;

  @IsString()
  @MaxLength(180)
  processorName!: string;

  @IsString()
  @MaxLength(1000)
  purpose!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  dataCategories?: string[];

  @IsIn(INTERNATIONAL_TRANSFER_MECHANISMS)
  mechanism!: InternationalTransferMechanism;

  @IsString()
  @MaxLength(300)
  mechanismReference!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  safeguards?: string[];

  @IsOptional()
  @IsDateString()
  reviewDueAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateInternationalTransferDto {
  @IsOptional()
  @IsUUID()
  ropaEntryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  destinationCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  destinationRegion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  processorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purpose?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  dataCategories?: string[];

  @IsOptional()
  @IsIn(INTERNATIONAL_TRANSFER_MECHANISMS)
  mechanism?: InternationalTransferMechanism;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  mechanismReference?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  safeguards?: string[];

  @IsOptional()
  @IsDateString()
  reviewDueAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class SubmitInternationalTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ApproveInternationalTransferDto {
  @IsString()
  @MaxLength(200)
  dpoApprovalRef!: string;

  @IsDateString()
  startsAt!: string;
}

export class CloseInternationalTransferDto {
  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
