import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AdapterRegistryService } from './registry/adapter-registry.service';

@ApiTags('tce')
@ApiBearerAuth()
@Controller('v1/tce/adapters')
export class TceController {
  constructor(
    private readonly registry: AdapterRegistryService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('tce.adapter.read')
  @ApiOkResponse({ description: 'List registered TCE/TCM/TCU adapters.' })
  list() {
    return this.registry.list();
  }

  @ApiOperation({ summary: 'GET :id/events' })
  @Get(':id/events')
  @RequirePermission('tce.adapter.read')
  @ApiOkResponse({ description: 'List lifecycle events for a TCE adapter.' })
  events(@Param('id') id: string) {
    return this.registry.events(id);
  }

  @ApiOperation({ summary: 'POST :id/enable' })
  @Post(':id/enable')
  @RequirePermission('tce.adapter.manage')
  @ApiOkResponse({ description: 'Enable a TCE adapter.' })
  async enable(@Req() request: RequestWithContext, @Param('id') id: string) {
    const result = await this.registry.enable(id);
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'tce.adapter_registry',
      {
        resourceId: result.adapterId,
        tableName: 'tce.adapter_registry',
        metadata: { status: result.status },
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST :id/disable' })
  @Post(':id/disable')
  @RequirePermission('tce.adapter.manage')
  @ApiOkResponse({ description: 'Disable a TCE adapter.' })
  async disable(@Req() request: RequestWithContext, @Param('id') id: string) {
    const result = await this.registry.disable(id);
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'tce.adapter_registry',
      {
        resourceId: result.adapterId,
        tableName: 'tce.adapter_registry',
        metadata: { status: result.status },
      },
    );
    return result;
  }
}
