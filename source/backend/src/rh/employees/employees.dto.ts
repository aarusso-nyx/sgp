import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
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

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  socialName?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdmitEmployeeDto extends EmployeeMutationDto {
  @ApiProperty()
  @IsDateString()
  hiredOn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  appointedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  possessionOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exerciseOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  functionalStatusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentLinkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobPositionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobFunctionId?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  pisPasep?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  rg?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  motherName?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fatherName?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalBasis?: string;
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

export class ChangeContractRegimeDto {
  @ApiProperty({
    enum: ['statutory', 'celetista', 'commissioned', 'temporary'],
  })
  @IsString()
  @IsIn(['statutory', 'celetista', 'commissioned', 'temporary'])
  contractType!: 'statutory' | 'celetista' | 'commissioned' | 'temporary';

  @ApiProperty()
  @IsDateString()
  effectiveOn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commissionPositionId?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  regimeLawReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  functionalStatusId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justification?: string;
}

export class ApproveCadastralChangeDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RejectCadastralChangeDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class CadastralChangeRequestDto {
  @ApiProperty({
    enum: ['cadastro', 'endereco', 'contato', 'dependentes', 'documentos'],
  })
  @IsString()
  @IsIn(['cadastro', 'endereco', 'contato', 'dependentes', 'documentos'])
  section!: 'cadastro' | 'endereco' | 'contato' | 'dependentes' | 'documentos';

  @ApiProperty({ type: Object })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  previousPayload?: Record<string, unknown>;
}

export class CreateServiceTimeRecordDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  source!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  startsOn!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  endsOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  daysCount?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
