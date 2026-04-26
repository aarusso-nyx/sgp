import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';

export class ProfileListQueryDto extends DomainListQueryDto {}

export class CreateProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AssignProfilePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  papeis!: string[];
}
