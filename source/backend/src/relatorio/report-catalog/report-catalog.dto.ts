import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateReportRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  definitionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payrollRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
}
