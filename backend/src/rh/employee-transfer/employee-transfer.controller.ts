import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  ApproveEmployeeTransferDto,
  CreateEmployeeTransferDto,
} from './employee-transfer.dto';
import { EmployeeTransferService } from './employee-transfer.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/rh/employee-transfer')
export class EmployeeTransferController {
  constructor(
    private readonly employeeTransferService: EmployeeTransferService,
  ) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('rh.movimentacao.read')
  @ApiOkResponse({ description: 'List employee transfer workflow queues.' })
  list(@Query('status') status?: string) {
    return this.employeeTransferService.listByStatus(status);
  }

  @ApiOperation({ summary: 'GET employee/:employeeId' })
  @Get('employee/:employeeId')
  @RequirePermission('rh.movimentacao.read')
  @ApiOkResponse({ description: 'List an employee transfer history.' })
  listByEmployee(@Param('employeeId') employeeId: string) {
    return this.employeeTransferService.listByEmployee(employeeId);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('rh.movimentacao.request')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.employee_transfer',
    tableName: 'hr.employee_transfer',
  })
  @ApiCreatedResponse({ description: 'Request an employee transfer.' })
  create(@Body() body: CreateEmployeeTransferDto) {
    return this.employeeTransferService.create(body);
  }

  @ApiOperation({ summary: 'POST :id/aprovar' })
  @Post(':id/aprovar')
  @RequirePermission('rh.movimentacao.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.employee_transfer',
    tableName: 'hr.employee_transfer',
  })
  @ApiOkResponse({ description: 'Approve an employee transfer.' })
  @HttpCode(200)
  approve(@Param('id') id: string, @Body() body: ApproveEmployeeTransferDto) {
    return this.employeeTransferService.approve(id, body);
  }

  @ApiOperation({ summary: 'POST :id/cancelar' })
  @Post(':id/cancelar')
  @RequirePermission('rh.movimentacao.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.employee_transfer',
    tableName: 'hr.employee_transfer',
  })
  @ApiOkResponse({ description: 'Cancel an employee transfer.' })
  @HttpCode(200)
  cancel(@Param('id') id: string) {
    return this.employeeTransferService.cancel(id);
  }

  @ApiOperation({ summary: 'POST :id/efetivar' })
  @Post(':id/efetivar')
  @RequirePermission('rh.movimentacao.effect')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.employee_transfer',
    tableName: 'hr.employee_transfer',
  })
  @ApiOkResponse({ description: 'Effect an approved employee transfer.' })
  @HttpCode(200)
  effect(@Param('id') id: string) {
    return this.employeeTransferService.effect(id);
  }
}
