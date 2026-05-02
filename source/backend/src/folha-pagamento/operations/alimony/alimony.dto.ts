import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export type AlimonyCalculationBasis = 'GROSS' | 'NET' | 'BASE_SPECIFIC';
export type AlimonyStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export class CreateEmployeeAlimonyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courtOrderNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  judgeName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiaryName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(14)
  beneficiaryCpf?: string;

  @ApiProperty()
  @IsNumber()
  beneficiaryBankCode!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiaryBranch!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiaryAccount!: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  judicialAccount!: boolean;

  @ApiProperty({ enum: ['GROSS', 'NET', 'BASE_SPECIFIC'] })
  @IsIn(['GROSS', 'NET', 'BASE_SPECIFIC'])
  calculationBasis!: AlimonyCalculationBasis;

  @ApiPropertyOptional()
  @ValidateIf((value: CreateEmployeeAlimonyDto) => value.fixedAmount == null)
  @IsString()
  rate?: string;

  @ApiPropertyOptional()
  @ValidateIf((value: CreateEmployeeAlimonyDto) => value.rate == null)
  @IsString()
  fixedAmount?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  baseSpecificCodes?: string[];

  @ApiProperty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validTo?: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  priority!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmployeeAlimonyDto extends CreateEmployeeAlimonyDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'TERMINATED'] })
  @IsIn(['ACTIVE', 'SUSPENDED', 'TERMINATED'])
  status!: AlimonyStatus;
}
