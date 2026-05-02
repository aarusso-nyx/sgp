import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type OnlineExamStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'VOIDED'
  | 'RESCHEDULED';

export type ProctoringEventKind =
  | 'SNAPSHOT'
  | 'AUDIO_FLAG'
  | 'GAZE_OFF_SCREEN'
  | 'SCREEN_SHARE_LOST'
  | 'PROHIBITED_APP'
  | 'LIVENESS_FAIL'
  | 'VOICE_MISMATCH';

export type ProctoringSeverity = 'INFO' | 'WARN' | 'SEVERE';
export type ProctoringArtifactKind =
  | 'SNAPSHOT'
  | 'AUDIO_CHUNK'
  | 'SCREEN_FRAME';

export class MediaConstraintsDto {
  @IsBoolean()
  camera!: boolean;

  @IsBoolean()
  microphone!: boolean;

  @IsBoolean()
  screenShare!: boolean;
}

export class StartOnlineExamDto {
  @IsUUID()
  applicationId!: string;

  @IsUUID()
  provaId!: string;

  @IsUUID()
  candidatoId!: string;

  @IsBoolean()
  recordingConsentAccepted!: boolean;

  @ValidateNested()
  @Type(() => MediaConstraintsDto)
  mediaConstraints!: MediaConstraintsDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1_500_000)
  biometricSampleBase64!: string;

  @IsOptional()
  @IsIn(['FINGERPRINT', 'FACE'])
  biometricKind?: 'FINGERPRINT' | 'FACE';

  @IsString()
  @IsNotEmpty()
  browserFingerprint!: string;

  @IsString()
  @IsNotEmpty()
  ipAddress!: string;

  @IsString()
  @IsNotEmpty()
  userAgent!: string;
}

export class CreateProctoringEventDto {
  @IsIn([
    'SNAPSHOT',
    'AUDIO_FLAG',
    'GAZE_OFF_SCREEN',
    'SCREEN_SHARE_LOST',
    'PROHIBITED_APP',
    'LIVENESS_FAIL',
    'VOICE_MISMATCH',
  ])
  kind!: ProctoringEventKind;

  @IsOptional()
  @IsIn(['INFO', 'WARN', 'SEVERE'])
  severity?: ProctoringSeverity;

  @IsOptional()
  @IsString()
  evidenceRef?: string;

  @IsOptional()
  @IsNumberString()
  aiScore?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class IngestProctoringArtifactDto {
  @IsIn(['SNAPSHOT', 'AUDIO_CHUNK', 'SCREEN_FRAME'])
  kind!: ProctoringArtifactKind;

  @IsString()
  @IsNotEmpty()
  storageRef!: string;

  @IsDateString()
  capturedAt!: string;

  @IsDateString()
  editalDate!: string;
}

export class SubmitOnlineExamDto {
  @IsOptional()
  @IsString()
  finalEvidenceRef?: string;
}

export class ReviewOnlineExamDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class AnalyzeAudioDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  transcript!: string;

  @IsOptional()
  @IsString()
  evidenceRef?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  voiceMismatchScore?: number;
}

export class AnalyzeFrameDto {
  @IsUUID()
  sessionId!: string;

  @IsObject()
  metrics!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  evidenceRef?: string;
}
