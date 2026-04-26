import {
  Body,
  Controller,
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
  CalculatePayrollRunDto,
  CreateAdvancePaymentDto,
  CreatePayrollRunDto,
  PopulatePayrollRunDto,
  UpdatePayrollRunStatusDto,
} from './payroll.dto';
import { PayrollService } from './payroll.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/folhas')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('folha:read')
  @ApiOkResponse({ description: 'List payroll runs.' })
  listRuns(@Query() query: DomainListQueryDto) {
    return this.payrollService.listRuns(query);
  }

  @Post()
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({ description: 'Create a payroll run.' })
  async createRun(
    @Req() request: RequestWithContext,
    @Body() body: CreatePayrollRunDto,
  ) {
    const created = await this.payrollService.createRun(body);
    await this.auditService.appendMutation(request, 'CREATE', 'payroll_run', {
      resourceId: created.id,
      tableName: 'payroll_run',
    });
    return created;
  }

  @Patch(':folha_id/status')
  @RequirePermissions('folha:write')
  @ApiOkResponse({ description: 'Update payroll run status.' })
  async updateStatus(
    @Req() request: RequestWithContext,
    @Param('folha_id') payrollRunId: string,
    @Body() body: UpdatePayrollRunStatusDto,
  ) {
    const updated = await this.payrollService.updateRunStatus(
      payrollRunId,
      body,
    );
    await this.auditService.appendMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: updated.id,
      tableName: 'payroll_run',
      metadata: { status: updated.status },
    });
    return updated;
  }

  @Post(':folha_rescisao_id/calcular')
  @Post(':folha_id/calcular')
  @RequirePermissions('folha:write')
  @ApiOkResponse({ description: 'Calculate a payroll run.' })
  async calculateRun(
    @Req() request: RequestWithContext,
    @Param() params: { folha_id?: string; folha_rescisao_id?: string },
    @Body() body: CalculatePayrollRunDto,
  ) {
    const payrollRunId = params.folha_id ?? params.folha_rescisao_id ?? '';
    const updated = await this.payrollService.calculateRun(payrollRunId, body);
    await this.auditService.appendMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: updated.id,
      tableName: 'payroll_run',
      metadata: { operation: 'calculate', status: updated.status },
    });
    return updated;
  }

  @Post(':folha_id/massa')
  @RequirePermissions('folha:write')
  @ApiOkResponse({
    description: 'Populate a payroll run with eligible payroll items.',
  })
  async populateRun(
    @Req() request: RequestWithContext,
    @Param('folha_id') payrollRunId: string,
    @Body() body: PopulatePayrollRunDto,
  ) {
    const updated = await this.payrollService.populateRun(payrollRunId, body);
    await this.auditService.appendMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: updated.id,
      tableName: 'payroll_run',
      metadata: { operation: 'populate', status: updated.status },
    });
    return updated;
  }

  @Post(':folha_id/adiantamentos')
  @RequirePermissions('folha:write')
  @ApiCreatedResponse({
    description:
      'Create and process an advance request/payment for a payroll run.',
  })
  async createAdvancePayment(
    @Req() request: RequestWithContext,
    @Param('folha_id') payrollRunId: string,
    @Body() body: CreateAdvancePaymentDto,
  ) {
    const created = await this.payrollService.createAdvancePayment(
      payrollRunId,
      body,
    );
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'advance_payment',
      {
        resourceId: created.paymentId,
        tableName: 'advance_payment',
        metadata: {
          requestId: created.requestId,
          employeeId: created.employeeId,
        },
      },
    );
    return created;
  }
}
