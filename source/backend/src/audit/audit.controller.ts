import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import * as requestContext from '../common/request-id/request-with-context';
import { AuditEventQueryDto, AuditReportRequestDto } from './audit.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/auditoria')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermissions('auditoria:read')
  @ApiOkResponse({ description: 'Paged audit events.' })
  events(@Query() query: AuditEventQueryDto) {
    return this.auditService.list(query);
  }

  @Get('logs/:id')
  @RequirePermissions('auditoria:read')
  @ApiOkResponse({ description: 'Fetch audit event detail by id.' })
  async eventById(@Param('id') id: string) {
    const event = await this.auditService.getById(id);
    if (!event) {
      throw new NotFoundException('Audit event not found');
    }
    return event;
  }

  @Post('exportacoes')
  @RequirePermissions('auditoria:read')
  @ApiCreatedResponse({ description: 'Create an audit trail report request.' })
  async createReportRequest(
    @Req() request: requestContext.RequestWithContext,
    @Body() body: AuditReportRequestDto,
  ) {
    const created = await this.auditService.createReportRequest(body);
    await this.auditService.appendMutation(
      request,
      'GENERATE',
      'audit_report',
      {
        resourceId: created.id,
        tableName: 'report_request',
        metadata: { reportCode: 'AUDIT_TRAIL_EXPORT' },
      },
    );
    return created;
  }

  @Get('exportacoes/:job_id')
  @RequirePermissions('auditoria:read')
  @ApiOkResponse({ description: 'Fetch audit export request status.' })
  async reportRequestStatus(@Param('job_id') jobId: string) {
    const status = await this.auditService.getReportRequestStatus(jobId);
    if (!status) {
      throw new NotFoundException('Audit export request not found');
    }
    return status;
  }
}
