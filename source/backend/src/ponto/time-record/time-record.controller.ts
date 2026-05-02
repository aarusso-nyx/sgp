import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateTimeRecordDto } from '../ponto.dto';
import { TimeRecordHashService } from './time-record-hash.service';

@ApiTags('ponto-time-record')
@ApiBearerAuth()
@Controller('v1/ponto/marcacoes')
export class TimeRecordController {
  constructor(private readonly timeRecordHashService: TimeRecordHashService) {}

  @Get(':employeeId')
  @RequirePermission('ponto.timerecord.read')
  @ApiOkResponse({ description: 'Paginated employee time records.' })
  list(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.timeRecordHashService.list(employeeId, Number(limit ?? 50));
  }

  @Post()
  @RequirePermission('ponto.timerecord.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.time_record',
    tableName: 'ponto.time_record',
  })
  @ApiCreatedResponse({ description: 'Create a manual chained time record.' })
  create(@Body() body: CreateTimeRecordDto) {
    return this.timeRecordHashService.createManual(body);
  }
}
