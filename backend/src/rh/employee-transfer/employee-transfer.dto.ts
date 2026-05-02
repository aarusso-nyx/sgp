import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const TRANSFER_TYPES = [
  'oficio',
  'pedido_criterio',
  'pedido_localidade',
  'permuta',
] as const;

export type EmployeeTransferType = (typeof TRANSFER_TYPES)[number];

export class CreateEmployeeTransferDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  origemWorkLocationId?: string;

  @ApiProperty()
  @IsString()
  destinoWorkLocationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  origemJobPositionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinoJobPositionId?: string;

  @ApiProperty({ enum: TRANSFER_TYPES })
  @IsIn(TRANSFER_TYPES)
  tipo!: EmployeeTransferType;

  @ApiProperty()
  @IsString()
  dataEfeito!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processoAdministrativoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveEmployeeTransferDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aprovadorUserId?: string;
}
