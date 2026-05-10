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
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import {
  ApproveInternationalTransferDto,
  CloseInternationalTransferDto,
  CreateInternationalTransferDto,
  InternationalTransferListQueryDto,
  SubmitInternationalTransferDto,
  UpdateInternationalTransferDto,
} from './international-transfer.dto';
import {
  InternationalTransferDto,
  InternationalTransferService,
} from './international-transfer.service';

@ApiTags('lgpd')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'lgpd_international_transfer',
  tableName: 'lgpd.international_transfer',
})
@Controller('v1/admin/lgpd/transferencias-internacionais')
export class InternationalTransferController {
  constructor(
    private readonly transferService: InternationalTransferService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET List international transfers' })
  @Get()
  @RequirePermission('auditoria.read')
  @ApiOkResponse({
    description: 'List LGPD international transfer mechanisms.',
  })
  list(@Query() query: InternationalTransferListQueryDto) {
    return this.transferService.list(query);
  }

  @ApiOperation({ summary: 'POST international transfer draft' })
  @Post()
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({
    description: 'Create an international transfer draft.',
  })
  async create(
    @Req() request: RequestWithContext,
    @Body() body: CreateInternationalTransferDto,
  ) {
    const created = await this.transferService.create(body);
    await this.auditTransfer(request, 'CREATE', created);
    return created;
  }

  @ApiOperation({ summary: 'PATCH international transfer draft' })
  @Patch(':id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Update a draft or DPO-review transfer.' })
  async update(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInternationalTransferDto,
  ) {
    const updated = await this.transferService.update(id, body);
    await this.auditTransfer(request, 'UPDATE', updated);
    return updated;
  }

  @ApiOperation({
    summary: 'PATCH submit international transfer for DPO review',
  })
  @Patch(':id/dpo-review')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Move a transfer draft to DPO review.' })
  async submitForDpoReview(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitInternationalTransferDto,
  ) {
    const updated = await this.transferService.submitForDpoReview(id, body);
    await this.auditTransfer(request, 'UPDATE', updated, 'DPO_REVIEW');
    return updated;
  }

  @ApiOperation({ summary: 'PATCH approve international transfer' })
  @Patch(':id/approve')
  @RequirePermission('gestao.write')
  @ApiOkResponse({
    description: 'Approve and activate a DPO-reviewed transfer.',
  })
  async approve(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApproveInternationalTransferDto,
  ) {
    const updated = await this.transferService.approve(id, body);
    await this.auditTransfer(request, 'APPROVE', updated, 'ACTIVE');
    return updated;
  }

  @ApiOperation({ summary: 'PATCH close international transfer' })
  @Patch(':id/close')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Close an active international transfer.' })
  async close(
    @Req() request: RequestWithContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseInternationalTransferDto,
  ) {
    const updated = await this.transferService.close(id, body);
    await this.auditTransfer(request, 'UPDATE', updated, 'CLOSED');
    return updated;
  }

  private auditTransfer(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE' | 'APPROVE',
    transfer: InternationalTransferDto,
    transition?: string,
  ) {
    return this.auditService.auditMutation(
      request,
      action,
      'lgpd_international_transfer',
      {
        resourceId: transfer.id,
        tableName: 'lgpd.international_transfer',
        metadata: {
          transition,
          status: transfer.status,
          flowKey: transfer.flowKey,
          processorName: transfer.processorName,
          destinationCountry: transfer.destination.country,
          mechanism: transfer.mechanism,
        },
      },
    );
  }
}
