import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';

export const AUDIT_ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'IMPORT',
  'EXPORT',
  'GENERATE',
  'PROCESS',
  'APPROVE',
  'REJECT',
  'DOWNLOAD',
] as const;

export type AuditActionValue = (typeof AUDIT_ACTIONS)[number];

export class AuditEventQueryDto extends DomainListQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive event start date/time.' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive event end date.' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Actor login or Cognito subject.' })
  @IsOptional()
  @IsString()
  actor?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTIONS })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditActionValue;

  @ApiPropertyOptional({ description: 'Database table name.' })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiPropertyOptional({ description: 'Domain resource type.' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Domain resource identifier.' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Request correlation id.' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({ minimum: 100, maximum: 599 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  statusCode?: number;
}

export class AuditReportRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actor?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTIONS })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditActionValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
