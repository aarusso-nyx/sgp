import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { ReportCatalogService } from './report-catalog.service';

@ApiTags('relatorio')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/relatorios')
export class ReportCatalogController {
  constructor(
    private readonly reportCatalogService: ReportCatalogService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('relatorio:read')
  @ApiOkResponse({ description: 'List report definitions.' })
  list(@Query() query: DomainListQueryDto) {
    return this.reportCatalogService.list(query);
  }
}
