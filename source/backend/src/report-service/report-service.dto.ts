import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RuntimeReportRequestDto {
  @ApiProperty()
  @IsUUID()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  definitionCode!: string;

  @ApiPropertyOptional({ default: 'RELATORIO' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  moduleKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payrollRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  processingTypeId?: string;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  competenceYear?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  competenceMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class ReportServicePollDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
