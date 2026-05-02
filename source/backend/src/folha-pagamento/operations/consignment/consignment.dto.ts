import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ConsignmentMarginQueryDto {
  @ApiProperty({ example: '2026-05' })
  @IsString()
  @IsNotEmpty()
  competence!: string;
}

export class CreateConsignmentLoanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consignmentEntityId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contractNumber!: string;

  @ApiProperty({ enum: ['PAYROLL_LOAN', 'CARD', 'OTHER'] })
  @IsIn(['PAYROLL_LOAN', 'CARD', 'OTHER'])
  kind!: 'PAYROLL_LOAN' | 'CARD' | 'OTHER';

  @ApiProperty({ example: '350.00' })
  @IsNumberString()
  monthlyAmount!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  installmentsTotal!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  installmentsPaid?: number;

  @ApiProperty({ example: '1.450000' })
  @IsNumberString()
  rate!: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  validFrom!: string;

  @ApiProperty({ example: '2030-04-30' })
  @IsDateString()
  validTo!: string;
}
