import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const RUBRICA_TYPES = [
  'provento',
  'desconto',
  'informativa',
  'base',
] as const;
export type RubricaType = (typeof RUBRICA_TYPES)[number];

export const FORMULA_ATTRIBUTE_TYPES = [
  'decimal',
  'int',
  'bool',
  'date',
  'text',
] as const;
export type FormulaAttributeType = (typeof FORMULA_ATTRIBUTE_TYPES)[number];

export class RubricaAttributeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: FORMULA_ATTRIBUTE_TYPES })
  @IsIn(FORMULA_ATTRIBUTE_TYPES)
  type!: FormulaAttributeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class RubricaMutationDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ enum: RUBRICA_TYPES })
  @IsIn(RUBRICA_TYPES)
  type!: RubricaType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  incidences?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formulaAlias?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formulaExpression?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formulaDependencies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  esocialCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officialRubricCode?: string | null;

  @ApiPropertyOptional({ type: [RubricaAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricaAttributeDto)
  attributes?: RubricaAttributeDto[];
}

export class RubricaCompileDto {
  @ApiProperty()
  @IsString()
  expression!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}

export class RubricaPreviewDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

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

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class JobPositionRubricaMutationDto {
  @ApiProperty()
  @IsUUID()
  jobPositionId!: string;

  @ApiProperty()
  @IsUUID()
  rubricaId!: string;

  @ApiProperty()
  @IsString()
  startsOn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applicationCondition?: string;
}
