import { Controller, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { SgpEsocialTransmissionService } from './sgp-esocial-transmission.service';
import { StynxEsocialClient } from './stynx-esocial.client';

@ApiTags('stynx-esocial-admin')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'esocial_events', tableName: 'esocial_events' })
@Controller('v1/admin/esocial')
export class StynxEsocialAdminGatewayController {
  constructor(
    private readonly client: StynxEsocialClient,
    private readonly transmissionService: SgpEsocialTransmissionService,
  ) {}

  @ApiOperation({ summary: 'POST admin/esocial/s2298/:orderId' })
  @Post('s2298/:orderId')
  @RequirePermission('esocial.event.write')
  emitS2298(@Param('orderId') orderId: string) {
    return this.client.enqueue({
      kind: 'trabalhador',
      eventClass: 'S-2298',
      sourceRef: { action: 'emit', orderId },
      payload: { action: 'emit', orderId },
    });
  }

  @ApiOperation({ summary: 'POST admin/esocial/s2306/:changeId' })
  @Post('s2306/:changeId')
  @RequirePermission('esocial.event.write')
  emitS2306(@Param('changeId') changeId: string) {
    return this.client.enqueue({
      kind: 'trabalhador',
      eventClass: 'S-2306',
      sourceRef: { action: 'emit', changeId },
      payload: { action: 'emit', changeId },
    });
  }

  @ApiOperation({
    summary: 'POST admin/esocial/messages/:messageId/transmit',
  })
  @Post('messages/:messageId/transmit')
  @RequirePermission('esocial.submission.retry')
  transmitMessage(@Param('messageId') messageId: string) {
    return this.transmissionService.transmitCurrentTenant(messageId);
  }

  @ApiOperation({ summary: 'POST admin/esocial/process-pending' })
  @Post('process-pending')
  @RequirePermission('esocial.submission.retry')
  processPending(@Query('limit') limit?: string) {
    return this.transmissionService.processPendingCurrentTenant(
      parseProcessLimit(limit),
    );
  }
}

function parseProcessLimit(value: string | undefined): number {
  if (!value) return 25;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 25;
}
