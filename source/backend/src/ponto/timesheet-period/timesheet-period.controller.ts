import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { OpenTimesheetPeriodDto } from '../ponto.dto';
import { TimesheetPeriodService } from './timesheet-period.service';

@ApiTags('ponto-timesheet-period')
@ApiBearerAuth()
@Controller('v1/ponto/periodos')
export class TimesheetPeriodController {
  constructor(
    private readonly timesheetPeriodService: TimesheetPeriodService,
  ) {}

  @Post()
  @RequirePermission('ponto.schedule.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.timesheet_period',
    tableName: 'ponto.timesheet_period',
  })
  @ApiCreatedResponse({ description: 'Open monthly timesheet periods.' })
  open(@Body() body: OpenTimesheetPeriodDto) {
    return this.timesheetPeriodService.open(body);
  }
}
