import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PayrollCatalogMutationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  active?: boolean;
}

export class PayrollAccountingAccountMutationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  allocationPercent!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  totalAllocationPercent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  earningDeductionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountingHistoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  simpleAccountingId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workLocationIds?: string[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  active?: boolean;
}
