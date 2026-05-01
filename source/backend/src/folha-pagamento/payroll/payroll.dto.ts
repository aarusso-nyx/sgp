import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePayrollRunDto {
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
  payrollTypeId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  processingTypeId!: string;

  @ApiProperty({ required: false })
  @IsString()
  branchId?: string;
}

export class UpdatePayrollRunStatusDto {
  @ApiProperty({
    enum: [
      'DRAFT',
      'QUEUED',
      'PROCESSING',
      'GENERATED',
      'APPROVED',
      'PAID',
      'CANCELED',
      'FAILED',
      'CLOSED',
    ],
  })
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class CalculatePayrollRunDto {
  @ApiProperty({ enum: ['TOTAL', 'RETROACTIVE'], default: 'TOTAL' })
  @IsOptional()
  @IsString()
  mode?: string;
}

export class PopulatePayrollRunDto {
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  replaceCalculatedItems?: boolean;
}

export class CreateAdvancePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requestedAmount!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  approvedAmount?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requestedOn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RunDecimoTerceiroDto {
  @ApiProperty({ minimum: 2000, maximum: 2100 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}

export class RunFeriasPayrollDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vacationRecordId!: string;
}
