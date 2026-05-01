import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TaxRateBracketDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsNumberString()
  bracketMin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  bracketMax?: string | null;

  @ApiProperty()
  @IsNumberString()
  rate!: string;

  @ApiProperty()
  @IsNumberString()
  deductionAmount!: string;

  @ApiProperty()
  @IsNumberString()
  dependentDeduction!: string;
}

export class UpsertIrrfTaxRateTableDto {
  @ApiProperty({ example: '2025-01-01' })
  @IsISO8601({ strict: true })
  competenceStart!: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  competenceEnd?: string | null;

  @ApiProperty({ example: 2025 })
  @Matches(/^\d{4}$/)
  referenceYear!: string;

  @ApiProperty({ type: [TaxRateBracketDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxRateBracketDto)
  brackets!: TaxRateBracketDto[];
}

export class UpsertRppsTaxRateTableDto {
  @ApiProperty({ example: '2025-01-01' })
  @IsISO8601({ strict: true })
  competenceStart!: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  competenceEnd?: string | null;

  @ApiProperty({ example: 2025 })
  @Matches(/^\d{4}$/)
  referenceYear!: string;

  @ApiPropertyOptional({ example: '8157.41' })
  @IsOptional()
  @IsNumberString()
  ceilingAmount?: string | null;

  @ApiProperty({ type: [TaxRateBracketDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxRateBracketDto)
  brackets!: TaxRateBracketDto[];
}
