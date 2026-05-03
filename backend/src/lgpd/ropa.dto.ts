import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const ROPA_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const ROPA_STATUSES = ['ACTIVE', 'UNDER_REVIEW', 'RETIRED'] as const;

export type RopaRiskLevel = (typeof ROPA_RISK_LEVELS)[number];
export type RopaStatus = (typeof ROPA_STATUSES)[number];

export class RopaListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;

  @IsOptional()
  @IsIn(ROPA_STATUSES)
  status?: RopaStatus;
}

export class CreateRopaEntryDto {
  @IsString()
  @MaxLength(120)
  flowKey!: string;

  @IsString()
  @MaxLength(180)
  operationName!: string;

  @IsString()
  @MaxLength(120)
  controllerArea!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  processorName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  externalRecipients?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  securityControls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  lifecycleEvidence?: string[];

  @IsOptional()
  @IsIn(ROPA_RISK_LEVELS)
  riskLevel?: RopaRiskLevel;

  @IsOptional()
  @IsIn(ROPA_STATUSES)
  status?: RopaStatus;

  @IsOptional()
  @IsDateString()
  reviewDueAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  internationalTransfer?: boolean;
}

export class UpdateRopaEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  operationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  controllerArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  processorName?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  externalRecipients?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  securityControls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  lifecycleEvidence?: string[];

  @IsOptional()
  @IsIn(ROPA_RISK_LEVELS)
  riskLevel?: RopaRiskLevel;

  @IsOptional()
  @IsIn(ROPA_STATUSES)
  status?: RopaStatus;

  @IsOptional()
  @IsDateString()
  reviewDueAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  internationalTransfer?: boolean;
}
