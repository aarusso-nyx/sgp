import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VacationInstallmentDto {
  @ApiProperty()
  @IsString()
  startsOn!: string;

  @ApiProperty()
  @IsString()
  endsOn!: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}

export class ScheduleVacationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vacationTypeId?: string;

  @ApiProperty()
  @IsString()
  accrualPeriodStart!: string;

  @ApiProperty()
  @IsString()
  accrualPeriodEnd!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  pecuniaryBonusDays?: number;

  @ApiProperty({ type: [VacationInstallmentDto], maxItems: 3 })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => VacationInstallmentDto)
  installments!: VacationInstallmentDto[];
}
