import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';

export class ReportRequestsQueryDto extends DomainListQueryDto {
  @ApiPropertyOptional({
    enum: ['REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED'],
  })
  @IsOptional()
  @IsIn(['REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED'])
  status?:
    | 'REQUESTED'
    | 'RUNNING'
    | 'COMPLETED'
    | 'FAILED'
    | 'EXPIRED'
    | undefined;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  definitionCode?: string;
}
