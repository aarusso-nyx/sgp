import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { LgpdDsarListQueryDto, UpdateLgpdDsarDto } from './dsar.dto';
import { LgpdDsarAdminService, LgpdDsarTicketDto } from './dsar.service';

@ApiTags('lgpd')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'lgpd_data_subject_request',
  tableName: 'lgpd.data_subject_request',
})
@Controller('v1/admin/lgpd/dsar')
export class LgpdDsarAdminController {
  constructor(
    private readonly dsarService: LgpdDsarAdminService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List DSAR tickets' })
  @Get()
  @RequirePermission('auditoria.read')
  @ApiOkResponse({ description: 'List LGPD DSAR tickets for operator triage.' })
  list(@Query() query: LgpdDsarListQueryDto) {
    return this.dsarService.list(query);
  }

  @ApiOperation({ summary: 'PATCH DSAR ticket lifecycle' })
  @Patch(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Patch an LGPD DSAR ticket lifecycle.' })
  async update(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLgpdDsarDto,
  ) {
    const updated = await this.dsarService.update(id, body);
    await this.auditDsar(request, updated);
    return updated;
  }

  private auditDsar(request: RequestWithContext, ticket: LgpdDsarTicketDto) {
    return this.auditService.auditMutation(
      request,
      'UPDATE',
      'lgpd_data_subject_request',
      {
        resourceId: ticket.id,
        tableName: 'lgpd.data_subject_request',
        metadata: {
          flowKey: ticket.flowKey,
          rightType: ticket.rightType,
          status: ticket.status,
          triageOutcome: ticket.triage.outcome,
          slaStatus: ticket.sla.status,
        },
      },
    );
  }
}
