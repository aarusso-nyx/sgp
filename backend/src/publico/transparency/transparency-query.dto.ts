import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class TransparencyQueryDto {
  @IsOptional()
  @IsDateString()
  competence?: string;

  @IsOptional()
  @IsString()
  organizationalUnit?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  search?: string;

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
  @Max(200)
  pageSize?: number = 20;
}

export class PublishTransparencyDto {
  @IsString()
  tenantId!: string;

  @IsString()
  payrollRunId!: string;
}
