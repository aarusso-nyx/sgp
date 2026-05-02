import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateESocialEventDto {
  @IsString()
  @MaxLength(20)
  tipo!: string;

  @IsString()
  @MaxLength(160)
  referencia!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  competencia!: string;

  @IsOptional()
  @IsObject()
  dados?: Record<string, unknown>;
}
