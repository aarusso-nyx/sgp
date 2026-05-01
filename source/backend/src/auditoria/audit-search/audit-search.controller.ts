import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuditSearchService } from './audit-search.service';

@ApiTags('auditoria')
@ApiBearerAuth()
@Controller('v1/auditoria/pesquisa')
export class AuditSearchController {
  constructor(private readonly auditSearchService: AuditSearchService) {}
}
