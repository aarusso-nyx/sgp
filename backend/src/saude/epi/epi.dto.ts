import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum EpiSignatureMethod {
  FISICA = 'FISICA',
  DIGITAL = 'DIGITAL',
  GOVBR = 'GOVBR',
}

export class CreateEpiInventoryDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[0-9A-Za-z.-]{3,40}$/)
  caNumber!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ minimum: 1, maximum: 120 })
  @IsInt()
  @Min(1)
  @Max(120)
  validityMonths!: number;
}

export class RegisterEpiDeliveryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  epiInventoryId!: string;

  @ApiProperty()
  @IsDateString()
  deliveredAt!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ enum: EpiSignatureMethod })
  @IsEnum(EpiSignatureMethod)
  signatureMethod!: EpiSignatureMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signatureEvidenceUri?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trainingDoneAt?: string;
}
