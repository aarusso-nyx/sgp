import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { PageQueryDto } from './pagination.dto';

export class DomainListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive text filter for representative read endpoints.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
