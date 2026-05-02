import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { ApplyPayrollBridgeDto } from '../ponto.dto';
import { PayrollBridgeService } from './payroll-bridge.service';

@ApiTags('ponto-payroll-bridge')
@ApiBearerAuth()
@Controller('v1/ponto/folha')
export class PayrollBridgeController {
  constructor(private readonly payrollBridgeService: PayrollBridgeService) {}

  @Post('preview')
  @RequirePermission('ponto.payroll.read')
  @AuditMutation({
    action: 'GENERATE',
    resourceType: 'ponto.payroll_bridge_preview',
    tableName: 'ponto.payroll_bridge_event',
  })
  @ApiOkResponse({
    description:
      'Preview payroll lines generated from a closed timesheet period.',
  })
  preview(@Body() body: ApplyPayrollBridgeDto) {
    return this.payrollBridgeService.preview(body);
  }

  @Post('apply')
  @RequirePermission('ponto.payroll.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'ponto.payroll_bridge_event',
    tableName: 'ponto.payroll_bridge_event',
  })
  @ApiOkResponse({ description: 'Apply payroll lines idempotently.' })
  apply(@Body() body: ApplyPayrollBridgeDto) {
    return this.payrollBridgeService.apply(body);
  }
}
