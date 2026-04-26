import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { CognitoJwtGuard } from '../../auth/cognito-jwt.guard';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import {
  PayrollAccountingAccountMutationDto,
  PayrollCatalogMutationDto,
} from './payroll-accounting.dto';
import { PayrollAccountingService } from './payroll-accounting.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/folhas')
export class PayrollAccountingController {
  constructor(
    private readonly payrollAccountingService: PayrollAccountingService,
    private readonly auditService: AuditService,
  ) {}

  @Get('catalogos')
  @RequirePermissions('folha:read')
  @ApiOkResponse({ description: 'List payroll catalog resources.' })
  listCatalogResources() {
    return this.payrollAccountingService.listCatalogResources();
  }

  @Get('catalogos/:resource')
  @RequirePermissions('folha:read')
  @ApiOkResponse({ description: 'List payroll catalog records.' })
  listCatalogRecords(
    @Param('resource') resource: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.payrollAccountingService.listCatalogRecords(resource, query);
  }

  @Post('catalogos/:resource')
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({ description: 'Create a payroll catalog record.' })
  async createCatalogRecord(
    @Req() request: RequestWithContext,
    @Param('resource') resource: string,
    @Body() body: PayrollCatalogMutationDto,
  ) {
    const created = await this.payrollAccountingService.createCatalogRecord(
      resource,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'payroll_catalog',
      {
        resourceId: created.id,
        tableName: resource,
        metadata: { resource, code: created.code },
      },
    );
    return created;
  }

  @Patch('catalogos/:resource/:id')
  @RequirePermissions('folha:write')
  @ApiOkResponse({ description: 'Update a payroll catalog record.' })
  async updateCatalogRecord(
    @Req() request: RequestWithContext,
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() body: PayrollCatalogMutationDto,
  ) {
    const updated = await this.payrollAccountingService.updateCatalogRecord(
      resource,
      id,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'UPDATE',
      'payroll_catalog',
      {
        resourceId: updated.id,
        tableName: resource,
        metadata: { resource, code: updated.code },
      },
    );
    return updated;
  }

  @Delete('catalogos/:resource/:id')
  @RequirePermissions('folha:write')
  @ApiOkResponse({ description: 'Deactivate a payroll catalog record.' })
  async deactivateCatalogRecord(
    @Req() request: RequestWithContext,
    @Param('resource') resource: string,
    @Param('id') id: string,
  ) {
    const updated = await this.payrollAccountingService.deactivateCatalogRecord(
      resource,
      id,
    );
    await this.auditService.appendMutation(
      request,
      'DELETE',
      'payroll_catalog',
      {
        resourceId: updated.id,
        tableName: resource,
        metadata: { resource, code: updated.code },
      },
    );
    return updated;
  }

  @Get('contabilidade')
  @RequirePermissions('folha:read')
  @ApiOkResponse({ description: 'List payroll accounting-account mappings.' })
  listAccountingAccounts(@Query() query: DomainListQueryDto) {
    return this.payrollAccountingService.listAccountingAccounts(query);
  }

  @Post('contabilidade')
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({
    description: 'Create a payroll accounting-account mapping.',
  })
  async createAccountingAccount(
    @Req() request: RequestWithContext,
    @Body() body: PayrollAccountingAccountMutationDto,
  ) {
    const created =
      await this.payrollAccountingService.createAccountingAccount(body);
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'accounting_account',
      {
        resourceId: created.id,
        tableName: 'accounting_account',
        metadata: { accountCode: created.code },
      },
    );
    return created;
  }

  @Patch('contabilidade/:id')
  @RequirePermissions('folha:write')
  @ApiOkResponse({
    description: 'Update a payroll accounting-account mapping.',
  })
  async updateAccountingAccount(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: PayrollAccountingAccountMutationDto,
  ) {
    const updated = await this.payrollAccountingService.updateAccountingAccount(
      id,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'UPDATE',
      'accounting_account',
      {
        resourceId: updated.id,
        tableName: 'accounting_account',
        metadata: { accountCode: updated.code },
      },
    );
    return updated;
  }

  @Delete('contabilidade/:id')
  @RequirePermissions('folha:write')
  @ApiOkResponse({
    description: 'Deactivate a payroll accounting-account mapping.',
  })
  async deactivateAccountingAccount(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const updated =
      await this.payrollAccountingService.deactivateAccountingAccount(id);
    await this.auditService.appendMutation(
      request,
      'DELETE',
      'accounting_account',
      {
        resourceId: updated.id,
        tableName: 'accounting_account',
        metadata: { accountCode: updated.code },
      },
    );
    return updated;
  }
}
