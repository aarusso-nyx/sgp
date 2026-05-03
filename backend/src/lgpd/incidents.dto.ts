import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LGPD_INCIDENT_STATUSES = [
  'DETECTED',
  'TRIAGED',
  'REPORTED',
  'COMPLEMENTED',
  'CLOSED',
] as const;

export const LGPD_INCIDENT_SEVERITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export type LgpdIncidentStatus = (typeof LGPD_INCIDENT_STATUSES)[number];
export type LgpdIncidentSeverity = (typeof LGPD_INCIDENT_SEVERITIES)[number];

export class LgpdIncidentListQueryDto {
  @IsOptional()
  @IsIn(LGPD_INCIDENT_STATUSES)
  status?: LgpdIncidentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;
}

export class CreateLgpdIncidentDto {
  @IsString()
  @MaxLength(500)
  summary!: string;

  @IsOptional()
  @IsUUID()
  ropaEntryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;

  @IsOptional()
  @IsDateString()
  detectedAt?: string;

  @IsOptional()
  @IsDateString()
  personalDataConfirmedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  affectedDataNature?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  affectedDataCategories?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  affectedSubjectsEstimate?: number;

  @IsOptional()
  @IsIn(LGPD_INCIDENT_SEVERITIES)
  severity?: LgpdIncidentSeverity;
}

export class TriageLgpdIncidentDto {
  @IsBoolean()
  riskRelevant!: boolean;

  @IsDateString()
  personalDataConfirmedAt!: string;

  @IsString()
  @MaxLength(80)
  affectedDataNature!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  affectedDataCategories!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  affectedSubjectsEstimate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  affectedChildrenEstimate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  affectedElderlyEstimate?: number;

  @IsIn(LGPD_INCIDENT_SEVERITIES)
  severity!: LgpdIncidentSeverity;

  @IsString()
  @MaxLength(4000)
  riskAssessment!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  mitigationMeasures!: string[];
}

export class ReportLgpdIncidentDto {
  @IsOptional()
  @IsDateString()
  reportedAt?: string;

  @IsString()
  @MaxLength(120)
  anpdProtocol!: string;

  @IsString()
  @MaxLength(250)
  controllerContact!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  titularCommunicationSummary?: string;
}

export class ComplementLgpdIncidentDto {
  @IsOptional()
  @IsDateString()
  complementedAt?: string;

  @IsString()
  @MaxLength(4000)
  complementSummary!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  mitigationMeasures?: string[];
}

export class CloseLgpdIncidentDto {
  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsString()
  @MaxLength(2000)
  closureReason!: string;
}
