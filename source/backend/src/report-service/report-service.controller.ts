import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  ReportServicePollDto,
  RuntimeReportRequestDto,
} from './report-service.dto';
import { ReportRuntimeService } from './report-service.service';

@ApiTags('report-service')
@Controller('v1/report-service')
export class ReportServiceController {
  constructor(private readonly reportRuntimeService: ReportRuntimeService) {}

  @Get('health')
  @ApiOkResponse({ description: 'Report service health.' })
  health() {
    return this.reportRuntimeService.health();
  }

  @Get('status')
  @ApiOkResponse({ description: 'Report service runtime status.' })
  status() {
    return this.reportRuntimeService.status();
  }

  @Post('requests')
  @ApiCreatedResponse({ description: 'Queue a report request.' })
  queueReport(@Body() body: RuntimeReportRequestDto) {
    return this.reportRuntimeService.queueReport(body);
  }

  @Post('poll')
  @ApiOkResponse({ description: 'Process pending report requests.' })
  pollOnce(@Body() body: ReportServicePollDto) {
    return this.reportRuntimeService.pollOnce(body);
  }
}
