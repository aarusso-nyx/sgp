import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { CreateESocialEventDto } from './esocial.dto';
import { ESocialService } from './esocial.service';

@ApiTags('esocial')
@ApiBearerAuth()
@Controller('v1/esocial')
export class ESocialController {
  constructor(
    private readonly eSocialService: ESocialService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST eventos' })
  @Post('eventos')
  @RequirePermission('folha.write')
  @ApiCreatedResponse({ description: 'Queue a new eSocial event.' })
  async createEvent(
    @Req() request: RequestWithContext,
    @Body() body: CreateESocialEventDto,
  ) {
    const created = await this.eSocialService.createEvent(body);
    await this.auditService.auditMutation(request, 'CREATE', 'esocial_event', {
      resourceId: created.id,
      tableName: 'esocial_event',
      metadata: { tipo: created.tipo, competencia: created.competencia },
    });
    return created;
  }
}
