import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRemittanceRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankId!: string;

  @ApiProperty({ required: false, default: 'CNAB240' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiProperty({ required: false, default: 'ACCOUNT_CREDIT' })
  @IsOptional()
  @IsString()
  launchType?: string;
}

export class ProcessReturnRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  remittanceId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  s3Key!: string;

  @ApiProperty({ required: false, default: 'CNAB240' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  returnFileName?: string;
}

export class CreateGfipRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payrollRunId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ minimum: 2000, maximum: 2100 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  competenceYear!: number;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  competenceMonth!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  collectionCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  modality!: string;
}
