import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateWorkScheduleDto } from '../ponto.dto';
import { WorkScheduleService } from './work-schedule.service';

@ApiTags('ponto-work-schedule')
@ApiBearerAuth()
@Controller('v1/ponto/jornadas')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('ponto.schedule.read')
  @ApiOkResponse({ description: 'Work schedules.' })
  list() {
    return this.workScheduleService.list();
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('ponto.schedule.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.work_schedule',
    tableName: 'ponto.work_schedule',
  })
  @ApiCreatedResponse({
    description: 'Create a work schedule with shifts and days.',
  })
  create(@Body() body: CreateWorkScheduleDto) {
    return this.workScheduleService.create(body);
  }
}
