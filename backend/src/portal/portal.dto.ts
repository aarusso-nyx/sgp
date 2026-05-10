import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PortalDocumentRequestDto {
  @IsString()
  @MaxLength(120)
  documentKind!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purpose?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
