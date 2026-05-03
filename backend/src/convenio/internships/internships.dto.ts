import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const internshipStatuses = [
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'TERMINATED',
] as const;

export class CreateInternshipProgramDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  startsOn?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  endsOn?: string;
}

export class CreateInternshipDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  programId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  registration!: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  internName!: string;

  @ApiProperty({ maxLength: 14 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(14)
  internCpf!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: ['FEMALE', 'MALE', 'OTHER', 'UNDECLARED'] })
  @IsOptional()
  @IsIn(['FEMALE', 'MALE', 'OTHER', 'UNDECLARED'])
  gender?: 'FEMALE' | 'MALE' | 'OTHER' | 'UNDECLARED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workplaceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentLinkId?: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  supervisorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorEmployeeId?: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  startsOn!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  endsOn!: string;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  termNumber!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  termSignedOn!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  activityPlanUri!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  activityPlanDescription!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  courseName?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  educationLevel?: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  role!: string;

  @ApiProperty({ example: '30.000000' })
  @IsNumberString()
  weeklyHours!: string;

  @ApiPropertyOptional({ example: '1200.00' })
  @IsOptional()
  @IsNumberString()
  stipendAmount?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  insurancePolicy?: string;
}

export class ExtendInternshipDto {
  @ApiProperty({ format: 'date' })
  @IsDateString()
  endsOn!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class TerminateInternshipDto {
  @ApiProperty({ format: 'date' })
  @IsDateString()
  terminationDate!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
