import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';

export const TALENT_POOL_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export const TALENT_POOL_LIST_STATUSES = [
  ...TALENT_POOL_STATUSES,
  'ALL',
] as const;

export type TalentPoolStatus = (typeof TALENT_POOL_STATUSES)[number];
export type TalentPoolListStatus = (typeof TALENT_POOL_LIST_STATUSES)[number];

export class TalentPoolListQueryDto extends DomainListQueryDto {
  @ApiPropertyOptional({ enum: TALENT_POOL_LIST_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @IsIn(TALENT_POOL_LIST_STATUSES)
  status?: TalentPoolListStatus;
}

export class CreateTalentPoolCandidateDto {
  @ApiProperty({ pattern: '^[0-9]{11}$' })
  @IsString()
  @Matches(/^[0-9]{11}$/)
  cpf!: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  birthDate!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @MaxLength(40)
  phone!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @ApiProperty()
  @IsDateString()
  lgpdConsentAt!: string;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @MaxLength(40)
  lgpdConsentVersion!: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  curriculumS3Key?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  profileSummary?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  skills?: string[];
}

export class UpdateTalentPoolCandidateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  curriculumS3Key?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  profileSummary?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  skills?: string[];

  @ApiPropertyOptional({ enum: TALENT_POOL_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(TALENT_POOL_STATUSES)
  status?: TalentPoolStatus;
}
