import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTrainingCertificateDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ maxLength: 240 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  courseName!: string;

  @ApiProperty({ maxLength: 240 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  issuer!: string;

  @ApiProperty()
  @IsDateString()
  issuedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  hoursWorkload?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  attachmentId?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateTrainingCertificateDto {
  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  courseName?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  issuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  hoursWorkload?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  attachmentId?: string | null;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
