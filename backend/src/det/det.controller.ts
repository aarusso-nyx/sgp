import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import {
  DetInboxProjectionDto,
  DetMessageListQueryDto,
  RequestDetAcknowledgementDto,
  UpdateDetMessageDto,
} from './det.dto';
import { DetProjectionService } from './det.service';

@ApiTags('det')
@ApiBearerAuth()
@Controller('v1/admin/det/messages')
export class DetMessagesController {
  constructor(
    private readonly detService: DetProjectionService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List DET inbox projection messages' })
  @Get()
  @RequirePermission('det.message.read')
  @ApiOkResponse({ description: 'List tenant-local DET message projections.' })
  list(@Query() query: DetMessageListQueryDto) {
    return this.detService.list(query);
  }

  @ApiOperation({ summary: 'POST Apply DET inbox projection update' })
  @Post()
  @RequirePermission('det.message.write')
  @ApiCreatedResponse({
    description:
      'Create or update a tenant-local DET inbox projection from stynx-det.',
  })
  async applyInboxUpdate(
    @Req() request: RequestWithContext,
    @Body() body: DetInboxProjectionDto,
  ) {
    const result = await this.detService.applyInboxUpdate(body);
    await this.auditService.auditMutation(request, 'PROCESS', 'det_message', {
      resourceId: result.id,
      tableName: 'fiscal.det_message_projection',
      metadata: {
        externalMessageId: result.externalMessageId,
        status: result.status,
        source: 'stynx-det',
      },
    });
    return result;
  }

  @ApiOperation({ summary: 'PATCH Update local DET operator state' })
  @Patch(':id')
  @RequirePermission('det.message.write')
  @ApiOkResponse({
    description: 'Update local DET read/archive/annotation state.',
  })
  async updateOperatorState(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDetMessageDto,
  ) {
    const result = await this.detService.updateOperatorState(id, body);
    await this.auditService.auditMutation(request, 'UPDATE', 'det_message', {
      resourceId: result.id,
      tableName: 'fiscal.det_message_projection',
      metadata: {
        externalMessageId: result.externalMessageId,
        status: result.status,
      },
    });
    return result;
  }

  @ApiOperation({
    summary: 'POST Request DET acknowledgement through stynx-det',
  })
  @Post(':id/acknowledgement-requests')
  @RequirePermission('det.message.write')
  @ApiCreatedResponse({
    description:
      'Record an SGP-local acknowledgement request. stynx-det owns the external ciência act.',
  })
  async requestAcknowledgement(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RequestDetAcknowledgementDto,
  ) {
    const result = await this.detService.requestAcknowledgement(id, body);
    await this.auditService.auditMutation(request, 'PROCESS', 'det_message', {
      resourceId: result.id,
      tableName: 'fiscal.det_message_projection',
      metadata: {
        externalMessageId: result.externalMessageId,
        status: result.status,
        boundary: 'stynx-det',
      },
    });
    return result;
  }
}
