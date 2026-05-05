import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { EmployeeMeritLeaveService } from './employee-merit-leave.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1/funcionarios/:employeeId/licenca-premio')
export class EmployeeMeritLeaveController {
  constructor(private readonly meritLeaveService: EmployeeMeritLeaveService) {}

  @ApiOperation({ summary: 'GET balance' })
  @Get('balance')
  @RequirePermission('rh.leave.read')
  @ApiOkResponse({ description: 'Employee merit leave accrual balance.' })
  balance(
    @Param('employeeId') employeeId: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.meritLeaveService.balance(employeeId, asOf);
  }
}
