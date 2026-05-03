import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { CreateBankAccountDto } from './bank-account.dto';
import { BankAccountService } from './bank-account.service';

@ApiTags('rh')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'employee_bank_account',
  tableName: 'employee_bank_account',
})
@Controller('v1/employees')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @ApiOperation({ summary: 'GET :id/bank-accounts' })
  @Get(':id/bank-accounts')
  @RequirePermission('hr.bank_account.read')
  @ApiOkResponse({ description: 'Employee bank accounts.' })
  list(@Param('id') id: string) {
    return this.bankAccountService.list(id);
  }

  @ApiOperation({ summary: 'POST :id/bank-accounts' })
  @Post(':id/bank-accounts')
  @RequirePermission('hr.bank_account.write')
  @ApiCreatedResponse({
    description: 'Create a validated employee bank account.',
  })
  create(@Param('id') id: string, @Body() body: CreateBankAccountDto) {
    return this.bankAccountService.create(id, body);
  }

  @ApiOperation({ summary: 'POST :id/bank-accounts/:accountId/revalidate' })
  @Post(':id/bank-accounts/:accountId/revalidate')
  @RequirePermission('hr.bank_account.write')
  @ApiOkResponse({ description: 'Revalidate an employee bank account.' })
  revalidate(@Param('id') id: string, @Param('accountId') accountId: string) {
    return this.bankAccountService.revalidate(id, accountId);
  }
}
