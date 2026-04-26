import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class EmployeeMutationDto {
  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  registration!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ maxLength: 14 })
  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class TerminateEmployeeDto {
  @ApiProperty()
  @IsDateString()
  terminationDate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  terminationReasonId!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justification?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  generateTerminationPayroll?: boolean;
}
