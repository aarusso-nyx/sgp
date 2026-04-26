import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { AuditSearchService } from './audit-search.service';

@ApiTags('auditoria')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/auditoria/pesquisa')
export class AuditSearchController {
  constructor(private readonly auditSearchService: AuditSearchService) {}
}
