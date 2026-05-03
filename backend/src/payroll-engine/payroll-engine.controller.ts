import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import {
  Public,
  RequirePermission,
} from '../iam/decorators/require-permission.decorator';
import { PayrollCalculationRequestDto } from './payroll-engine.dto';
import { PayrollEngineService } from './payroll-engine.service';

@ApiTags('payroll-engine')
@AuditMutation({ resourceType: 'payroll_calculation', action: 'PROCESS' })
@Controller('v1/payroll-engine')
export class PayrollEngineController {
  constructor(private readonly payrollEngineService: PayrollEngineService) {}

  @ApiOperation({ summary: 'GET health' })
  @Get('health')
  @Public()
  @ApiOkResponse({ description: 'Payroll engine health.' })
  health() {
    return this.payrollEngineService.health();
  }

  @ApiOperation({ summary: 'GET status' })
  @Get('status')
  @RequirePermission('folha.read')
  @ApiOkResponse({ description: 'Payroll engine runtime and formula status.' })
  status() {
    return this.payrollEngineService.status();
  }

  @ApiOperation({ summary: 'POST calculations' })
  @Post('calculations')
  @RequirePermission('folha.write')
  @ApiCreatedResponse({
    description: 'Validate and execute a payroll calculation request.',
  })
  requestCalculation(@Body() body: PayrollCalculationRequestDto) {
    return this.payrollEngineService.requestCalculation(body);
  }
}
