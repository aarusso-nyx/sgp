import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import * as requestContext from '../common/request-id/request-with-context';
import { AuditEventQueryDto, AuditReportRequestDto } from './audit.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('v1/auditoria')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({ summary: 'GET logs' })
  @Get('logs')
  @RequirePermission('auditoria.read')
  @ApiOkResponse({ description: 'Paged audit events.' })
  events(@Query() query: AuditEventQueryDto) {
    return this.auditService.list(query);
  }

  @ApiOperation({ summary: 'GET logs/:id' })
  @Get('logs/:id')
  @RequirePermission('auditoria.read')
  @ApiOkResponse({ description: 'Fetch audit event detail by id.' })
  async eventById(@Param('id') id: string) {
    const event = await this.auditService.getById(id);
    if (!event) {
      throw new NotFoundException('Audit event not found');
    }
    return event;
  }

  @ApiOperation({ summary: 'POST exportacoes' })
  @Post('exportacoes')
  @RequirePermission('auditoria.read')
  @ApiCreatedResponse({ description: 'Create an audit trail report request.' })
  async createReportRequest(
    @Req() request: requestContext.RequestWithContext,
    @Body() body: AuditReportRequestDto,
  ) {
    const created = await this.auditService.createReportRequest(body);
    await this.auditService.auditMutation(request, 'GENERATE', 'audit_report', {
      resourceId: created.id,
      tableName: 'report_request',
      metadata: { reportCode: 'AUDIT_TRAIL_EXPORT' },
    });
    return created;
  }

  @ApiOperation({ summary: 'GET exportacoes/:job_id' })
  @Get('exportacoes/:job_id')
  @RequirePermission('auditoria.read')
  @ApiOkResponse({ description: 'Fetch audit export request status.' })
  async reportRequestStatus(@Param('job_id') jobId: string) {
    const status = await this.auditService.getReportRequestStatus(jobId);
    if (!status) {
      throw new NotFoundException('Audit export request not found');
    }
    return status;
  }
}
