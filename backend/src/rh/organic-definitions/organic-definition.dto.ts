import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class OrganicDefinitionMutationDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  workLocationId!: string;

  @IsUUID()
  jobPositionId!: string;

  @IsInt()
  @Min(0)
  vacanciesTotal!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  vacanciesFilled?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
