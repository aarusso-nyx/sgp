import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class ScheduleMedicalLeaveAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slotRef!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  scheduledOn!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  scheduledTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialtyRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduleRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;
}
