import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import type { PortabilityLayout } from './portability-parser.service';

export class UploadPortabilityFileDto {
  @ApiProperty()
  @IsUUID()
  sourceConsignmentEntityId!: string;

  @ApiProperty()
  @IsUUID()
  targetConsignmentEntityId!: string;

  @ApiProperty({ enum: ['CANONICAL_CSV', 'BANK_X', 'BANK_Y'] })
  @IsIn(['CANONICAL_CSV', 'BANK_X', 'BANK_Y'])
  layout!: PortabilityLayout;

  @ApiProperty({
    description: 'UTF-8 file content for the selected portability adapter.',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;
}
