import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { PayrollCalculationRequestDto } from './payroll-engine.dto';
import { PayrollEngineService } from './payroll-engine.service';

@ApiTags('payroll-engine')
@AuditMutation({ resourceType: 'payroll_calculation', action: 'PROCESS' })
@Controller('v1/payroll-engine')
export class PayrollEngineController {
  constructor(private readonly payrollEngineService: PayrollEngineService) {}

  @Get('health')
  @ApiOkResponse({ description: 'Payroll engine health.' })
  health() {
    return this.payrollEngineService.health();
  }

  @Get('status')
  @ApiOkResponse({ description: 'Payroll engine runtime and formula status.' })
  status() {
    return this.payrollEngineService.status();
  }

  @Post('calculations')
  @ApiCreatedResponse({
    description: 'Validate and execute a payroll calculation request.',
  })
  requestCalculation(@Body() body: PayrollCalculationRequestDto) {
    return this.payrollEngineService.requestCalculation(body);
  }
}
