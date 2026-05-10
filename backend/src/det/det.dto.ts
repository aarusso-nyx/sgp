import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  DET_MESSAGE_STATUSES,
  type DetMessageStatus,
} from '../integrations/stynx-det/contracts';

export class DetMessageListQueryDto {
  @IsOptional()
  @IsIn(DET_MESSAGE_STATUSES)
  status?: DetMessageStatus;
}

export class DetInboxProjectionDto {
  @IsString()
  @MaxLength(180)
  externalMessageId!: string;

  @IsString()
  @MaxLength(240)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  sender?: string;

  @IsDateString()
  receivedAt!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsDateString()
  readAt?: string;

  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string;

  @IsIn(DET_MESSAGE_STATUSES)
  status!: DetMessageStatus;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class UpdateDetMessageDto {
  @IsOptional()
  @IsIn(['READ', 'ARCHIVED'])
  status?: Extract<DetMessageStatus, 'READ' | 'ARCHIVED'>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  annotation?: string | null;
}

export class RequestDetAcknowledgementDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
