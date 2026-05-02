import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const JOB_POSITION_CATEGORIES = [
  'efetivo',
  'comissionado',
  'temporario',
  'eletivo',
  'emprego_publico',
] as const;

export class JobPositionMutationDto {
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

  @IsIn(JOB_POSITION_CATEGORIES)
  category!: (typeof JOB_POSITION_CATEGORIES)[number];

  @IsString()
  @MaxLength(80)
  legalRegime!: string;

  @IsString()
  @MaxLength(120)
  creationLaw!: string;

  @IsInt()
  @Min(0)
  vacanciesCount!: number;

  @IsOptional()
  @IsUUID()
  salaryRangeId?: string;
}

export class SalaryRangeMutationDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  groupCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  classCode?: string;

  @IsDateString()
  startsOn!: string;

  @IsOptional()
  @IsDateString()
  endsOn?: string;
}

export class SalaryRangeLevelMutationDto {
  @IsUUID()
  salaryRangeId!: string;

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

  @IsInt()
  @Min(1)
  classNumber!: number;

  @IsInt()
  @Min(1)
  levelNumber!: number;

  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  baseSalary!: string;
}
