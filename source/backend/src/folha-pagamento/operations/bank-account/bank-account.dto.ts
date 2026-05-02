import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  agency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyDigit?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountDigit!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(14)
  holderCpf!: string;

  @ApiProperty({ enum: ['SELF', 'DEPENDENT'] })
  @IsIn(['SELF', 'DEPENDENT'])
  holderKind!: 'SELF' | 'DEPENDENT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dependentId?: string;
}
