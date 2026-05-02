import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { CreateLeaveDto } from './leaves.dto';
import { LeavesService } from './leaves.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/licencas')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @RequirePermission('rh.leave.request')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.leave_record',
    tableName: 'hr.leave_record',
  })
  @ApiCreatedResponse({ description: 'Request a general employee leave.' })
  create(@Body() body: CreateLeaveDto) {
    return this.leavesService.create(body);
  }

  @Get(':employee_id')
  @RequirePermission('rh.leave.read')
  @ApiOkResponse({ description: 'List employee general leaves.' })
  list(@Param('employee_id') employeeId: string) {
    return this.leavesService.listByEmployee(employeeId);
  }

  @Post(':id/aprovar')
  @RequirePermission('rh.leave.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.leave_record',
    tableName: 'hr.leave_record',
  })
  @ApiOkResponse({ description: 'Approve a general leave request.' })
  @HttpCode(200)
  approve(@Param('id') id: string) {
    return this.leavesService.approve(id);
  }

  @Post(':id/cancelar')
  @RequirePermission('rh.leave.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.leave_record',
    tableName: 'hr.leave_record',
  })
  @ApiOkResponse({ description: 'Cancel a general leave request.' })
  @HttpCode(200)
  cancel(@Param('id') id: string) {
    return this.leavesService.cancel(id);
  }
}
