import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { Idempotent } from '../common/idempotency/idempotency.decorator';
import {
  Public,
  RequirePermission,
} from '../iam/decorators/require-permission.decorator';
import {
  ReportServicePollDto,
  RuntimeReportRequestDto,
} from './report-service.dto';
import { ReportRuntimeService } from './report-service.service';

@ApiTags('report-service')
@AuditMutation({ resourceType: 'report_request', tableName: 'report_request' })
@Controller('v1/report-service')
export class ReportServiceController {
  constructor(private readonly reportRuntimeService: ReportRuntimeService) {}

  @ApiOperation({ summary: 'GET health' })
  @Get('health')
  @Public()
  @ApiOkResponse({ description: 'Report service health.' })
  health() {
    return this.reportRuntimeService.health();
  }

  @ApiOperation({ summary: 'GET status' })
  @Get('status')
  @RequirePermission('relatorio.read')
  @ApiOkResponse({ description: 'Report service runtime status.' })
  status() {
    return this.reportRuntimeService.status();
  }

  @ApiOperation({ summary: 'POST requests' })
  @Idempotent()
  @Post('requests')
  @RequirePermission('relatorio.generate')
  @ApiCreatedResponse({ description: 'Queue a report request.' })
  queueReport(@Body() body: RuntimeReportRequestDto) {
    return this.reportRuntimeService.queueReport(body);
  }

  @ApiOperation({ summary: 'POST poll' })
  @Post('poll')
  @RequirePermission('relatorio.generate')
  @ApiOkResponse({ description: 'Process pending report requests.' })
  pollOnce(@Body() body: ReportServicePollDto) {
    return this.reportRuntimeService.pollOnce(body);
  }
}
