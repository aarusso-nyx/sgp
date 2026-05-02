import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { AssignWorkScheduleDto } from '../ponto.dto';
import { AssignmentService } from './assignment.service';

@ApiTags('ponto-assignment')
@ApiBearerAuth()
@Controller('v1/ponto/atribuicoes')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @RequirePermission('ponto.schedule.read')
  @ApiOkResponse({ description: 'Employee work schedule assignments.' })
  list(@Query('employeeId') employeeId?: string) {
    return this.assignmentService.list(employeeId);
  }

  @Post()
  @RequirePermission('ponto.schedule.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'ponto.employee_schedule_assignment',
    tableName: 'ponto.employee_schedule_assignment',
  })
  @ApiCreatedResponse({ description: 'Assign a work schedule to an employee.' })
  assign(@Body() body: AssignWorkScheduleDto) {
    return this.assignmentService.assign(body);
  }
}
