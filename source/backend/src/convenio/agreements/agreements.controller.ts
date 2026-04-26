import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { AgreementsService } from './agreements.service';

@ApiTags('convenio')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/convenios')
export class AgreementsController {
  constructor(
    private readonly agreementsService: AgreementsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('convenio:read')
  @ApiOkResponse({ description: 'List agreements.' })
  list(@Query() query: DomainListQueryDto) {
    return this.agreementsService.list(query);
  }
}
