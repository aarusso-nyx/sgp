import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConcursoVagaDto {
  @IsUUID()
  positionId!: string;

  @IsInt()
  @Min(1)
  totalSeats!: number;

  @IsInt()
  @Min(0)
  pcdSeats!: number;

  @IsInt()
  @Min(0)
  racialSeats!: number;

  @IsInt()
  @Min(0)
  indigenousSeats!: number;

  @IsOptional()
  @IsObject()
  requirement?: Record<string, unknown>;

  @IsNumberString()
  baseSalary!: string;
}

export class CreateConcursoDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  validUntil!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConcursoVagaDto)
  vagas!: ConcursoVagaDto[];
}

export class CreateEditalDto {
  @IsString()
  @IsNotEmpty()
  documentRef!: string;

  @IsString()
  @IsNotEmpty()
  administrativeAct!: string;

  @IsDateString()
  administrativeActDate!: string;

  @IsOptional()
  @IsDateString()
  resourceDeadlineAt?: string;
}

export class PublishEditalDto {
  @IsString()
  @IsNotEmpty()
  administrativeAct!: string;

  @IsDateString()
  administrativeActDate!: string;

  @IsUrl({ require_tld: false })
  publicUrl!: string;
}
