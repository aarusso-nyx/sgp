import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const LGPD_DSAR_STATUSES = [
  'PENDING_TRIAGE',
  'IN_PROGRESS',
  'WAITING_CONTROLLER',
  'ANSWERED',
  'REJECTED',
  'CANCELLED',
] as const;

export const LGPD_DSAR_TRIAGE_OUTCOMES = [
  'PENDING',
  'EXECUTABLE',
  'RETENTION_RESTRICTED',
  'LEGALLY_BLOCKED',
] as const;

export type LgpdDsarStatus = (typeof LGPD_DSAR_STATUSES)[number];
export type LgpdDsarTriageOutcome = (typeof LGPD_DSAR_TRIAGE_OUTCOMES)[number];

export class LgpdDsarListQueryDto {
  @IsOptional()
  @IsIn(LGPD_DSAR_STATUSES)
  status?: LgpdDsarStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  flowKey?: string;
}

export class UpdateLgpdDsarDto {
  @IsOptional()
  @IsIn(LGPD_DSAR_STATUSES)
  status?: LgpdDsarStatus;

  @IsOptional()
  @IsIn(LGPD_DSAR_TRIAGE_OUTCOMES)
  triageOutcome?: LgpdDsarTriageOutcome;
}
