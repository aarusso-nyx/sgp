import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { CreateESocialEventDto } from './esocial.dto';
import { ESocialService } from './esocial.service';

@ApiTags('esocial')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/esocial')
export class ESocialController {
  constructor(
    private readonly eSocialService: ESocialService,
    private readonly auditService: AuditService,
  ) {}

  @Post('eventos')
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({ description: 'Queue a new eSocial event.' })
  async createEvent(
    @Req() request: RequestWithContext,
    @Body() body: CreateESocialEventDto,
  ) {
    const created = await this.eSocialService.createEvent(body);
    await this.auditService.appendMutation(request, 'CREATE', 'esocial_event', {
      resourceId: created.id,
      tableName: 'esocial_event',
      metadata: { tipo: created.tipo, competencia: created.competencia },
    });
    return created;
  }
}
