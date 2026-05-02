import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('convenio')
@ApiBearerAuth()
@Controller('v1/convenios')
export class AgreementsController {
  constructor(
    private readonly agreementsService: AgreementsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('convenio.read')
  @ApiOkResponse({ description: 'List agreements.' })
  list(@Query() query: DomainListQueryDto) {
    return this.agreementsService.list(query);
  }
}
