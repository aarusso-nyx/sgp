import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { ReportCatalogService } from './report-catalog.service';

@ApiTags('relatorio')
@ApiBearerAuth()
@Controller('v1/relatorios')
export class ReportCatalogController {
  constructor(
    private readonly reportCatalogService: ReportCatalogService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('relatorio.read')
  @ApiOkResponse({ description: 'List report definitions.' })
  list(@Query() query: DomainListQueryDto) {
    return this.reportCatalogService.list(query);
  }
}
