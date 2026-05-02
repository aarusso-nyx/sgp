import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import {
  ConsignmentMarginQueryDto,
  CreateConsignmentLoanDto,
} from './consignment.dto';
import { ConsignmentLoanService } from './consignment-loan.service';

@ApiTags('payment')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'payment.consignment_loan',
  tableName: 'payment.consignment_loan',
})
@Controller('v1/employees')
export class ConsignmentController {
  constructor(
    private readonly consignmentLoanService: ConsignmentLoanService,
  ) {}

  @Get(':id/consignment-margin')
  @RequirePermission('payment.consignment.read')
  @ApiOkResponse({ description: 'Employee consignment margin.' })
  getMargin(
    @Param('id') id: string,
    @Query() query: ConsignmentMarginQueryDto,
  ) {
    return this.consignmentLoanService.getMargin(id, query.competence);
  }

  @Get(':id/consignment-loans')
  @RequirePermission('payment.consignment.read')
  @ApiOkResponse({ description: 'Employee consignment loans.' })
  list(@Param('id') id: string) {
    return this.consignmentLoanService.list(id);
  }

  @Post(':id/consignment-loans')
  @RequirePermission('payment.consignment.write')
  @ApiCreatedResponse({ description: 'Create a consignment loan.' })
  create(@Param('id') id: string, @Body() body: CreateConsignmentLoanDto) {
    return this.consignmentLoanService.create(id, body);
  }
}
