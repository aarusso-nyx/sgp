import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum ReintegrationKind {
  JUDICIAL = 'JUDICIAL',
  ADMINISTRATIVE_ANNULMENT = 'ADMINISTRATIVE_ANNULMENT',
  AMNESTY = 'AMNESTY',
}

export class RegisterReintegrationOrderDto {
  @IsUUID()
  employmentLinkId!: string;

  @IsDateString()
  reinstatementDate!: string;

  @IsEnum(ReintegrationKind)
  kind!: ReintegrationKind;

  @IsOptional()
  @IsString()
  processNumber?: string;

  @IsOptional()
  @IsString()
  court?: string;

  @IsDateString()
  decisionDate!: string;

  @IsOptional()
  @IsString()
  attachmentUri?: string;

  @IsOptional()
  @IsUUID()
  originalTerminationEventId?: string;

  @IsOptional()
  @IsString()
  originalS2299Receipt?: string;
}

export class ApplyReintegrationOrderDto {
  @IsOptional()
  @IsNotEmpty()
  reason?: string;
}
