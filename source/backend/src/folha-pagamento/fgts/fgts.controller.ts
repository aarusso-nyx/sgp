import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { FgtsService } from './fgts.service';

@ApiTags('fgts')
@ApiBearerAuth()
@Controller('v1/admin/fgts')
export class FgtsController {
  constructor(private readonly fgtsService: FgtsService) {}

  @Get('accounts/:employeeId')
  @RequirePermission('payroll.fgts.read')
  @ApiOkResponse({
    description: 'List FGTS accounts and movements by employee.',
  })
  accountByEmployee(@Param('employeeId') employeeId: string) {
    return this.fgtsService.accountByEmployee(employeeId);
  }

  @Post('reprocessar')
  @RequirePermission('payroll.fgts.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'payroll.fgts',
    tableName: 'payroll.fgts_movement',
  })
  @ApiCreatedResponse({ description: 'Reprocess FGTS monthly deposits.' })
  reprocess(@Body() body: { payrollRunId: string }) {
    return this.fgtsService.accrueMonthly(body.payrollRunId);
  }
}
