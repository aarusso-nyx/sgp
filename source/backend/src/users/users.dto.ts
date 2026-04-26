import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';

export class UserListQueryDto extends DomainListQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';

  @ApiPropertyOptional({ description: 'Filter users by assigned profile id.' })
  @IsOptional()
  @IsUUID()
  profileId?: string;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  login!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  cpf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cognitoSub?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED'])
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
}

export class AssignProfilesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  perfis!: string[];
}

export class AssignDirectRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  papeis!: string[];
}
