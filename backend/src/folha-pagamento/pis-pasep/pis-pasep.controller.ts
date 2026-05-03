import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PisPasepService } from './pis-pasep.service';

@ApiTags('pis-pasep')
@ApiBearerAuth()
@Controller('v1/admin/pis-pasep')
export class PisPasepController {
  constructor(private readonly service: PisPasepService) {}

  @ApiOperation({ summary: 'GET :employeeId' })
  @Get(':employeeId')
  @RequirePermission('payroll.payroll.read')
  @ApiOkResponse({ description: 'Read annual PIS/PASEP base by employee.' })
  getYear(
    @Param('employeeId') employeeId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.service.getYear(employeeId, year);
  }
}
