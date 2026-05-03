import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { LAI_REQUEST_STATUSES } from './lai-request-state-machine';
import type { LaiRequestStatus } from './lai-request-state-machine';

export class CreateLaiRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  requesterName!: string;

  @IsEmail()
  @MaxLength(320)
  requesterEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  requesterDocument?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  requestText!: string;
}

export class LaiRequestStatusQueryDto {
  @IsString()
  @MinLength(24)
  @MaxLength(80)
  accessKey!: string;
}

export class TransitionLaiRequestDto {
  @IsIn(LAI_REQUEST_STATUSES)
  status!: LaiRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class LaiRequestListQueryDto {
  @IsOptional()
  @IsIn(LAI_REQUEST_STATUSES)
  status?: LaiRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
