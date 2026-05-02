import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CareerPlanMutationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  institutingLaw!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  startsOn!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  endsOn?: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(1)
  classCount!: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(1)
  referenceCount!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  progressionRule!: string;

  @ApiPropertyOptional({ type: () => [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  jobPositionIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salaryRangeId?: string;
}

export class CareerTrailQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
