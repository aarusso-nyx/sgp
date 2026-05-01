import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import {
  CalculatePayrollRunDto,
  CreateAdvancePaymentDto,
  CreatePayrollRunDto,
  RunFeriasPayrollDto,
  PopulatePayrollRunDto,
  RunDecimoTerceiroDto,
  UpdatePayrollRunStatusDto,
} from './payroll.dto';
import { DecimoTerceiroService } from './decimo-terceiro.service';
import { FeriasPayrollService } from './ferias-payroll.service';
import { PayrollService } from './payroll.service';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/folhas')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly decimoTerceiroService: DecimoTerceiroService,
    private readonly feriasPayrollService: FeriasPayrollService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('folha.read')
  @ApiOkResponse({ description: 'List payroll runs.' })
  listRuns(@Query() query: DomainListQueryDto) {
    return this.payrollService.listRuns(query);
  }

  @Get(':folha_id/historico')
  @RequirePermission('folha.read')
  @ApiOkResponse({ description: 'List payroll run execution history.' })
  listRunHistory(@Param('folha_id') payrollRunId: string) {
    return this.payrollService.listRunHistory(payrollRunId);
  }

  @Post()
  @RequirePermission('folha.write')
  @ApiCreatedResponse({ description: 'Create a payroll run.' })
  async createRun(
    @Req() request: RequestWithContext,
    @Body() body: CreatePayrollRunDto,
  ) {
    const created = await this.payrollService.createRun(body);
    await this.auditService.auditMutation(request, 'CREATE', 'payroll_run', {
      resourceId: created.id,
      tableName: 'payroll_run',
    });
    return created;
  }

  @Patch(':folha_id/status')
  @RequirePermission('folha.write')
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
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: updated.id,
      tableName: 'payroll_run',
      metadata: { status: updated.status },
    });
    return updated;
  }

  @Post(':folha_rescisao_id/calcular')
  @Post(':folha_id/calcular')
  @RequirePermission('folha.write')
  @ApiOkResponse({ description: 'Calculate a payroll run.' })
  async calculateRun(
    @Req() request: RequestWithContext,
    @Param() params: { folha_id?: string; folha_rescisao_id?: string },
    @Body() body: CalculatePayrollRunDto,
  ) {
    const payrollRunId = params.folha_id ?? params.folha_rescisao_id ?? '';
    const updated = await this.payrollService.calculateRun(payrollRunId, body);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: updated.id,
      tableName: 'payroll_run',
      metadata: { operation: 'calculate', status: updated.status },
    });
    return updated;
  }

  @Post(':folha_id/massa')
  @RequirePermission('folha.write')
  @ApiOkResponse({
    description: 'Populate a payroll run with eligible payroll items.',
  })
  async populateRun(
    @Req() request: RequestWithContext,
    @Param('folha_id') payrollRunId: string,
    @Body() body: PopulatePayrollRunDto,
  ) {
    const updated = await this.payrollService.populateRun(payrollRunId, body);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: updated.id,
      tableName: 'payroll_run',
      metadata: { operation: 'populate', status: updated.status },
    });
    return updated;
  }

  @Post(':folha_id/adiantamentos')
  @RequirePermission('folha.write')
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
    await this.auditService.auditMutation(
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

  @Post('decimo-terceiro/adiantamento')
  @RequirePermission('payroll.run.execute')
  @ApiCreatedResponse({ description: 'Generate the first 13th salary parcel.' })
  async runDecimoTerceiroAdiantamento(
    @Req() request: RequestWithContext,
    @Body() body: RunDecimoTerceiroDto,
  ) {
    const created = await this.decimoTerceiroService.runAdiantamento(
      request.actor?.tenantId ?? request.tenantId ?? '',
      body.year,
    );
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: created.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'decimo_terceiro_adiantamento',
        year: body.year,
        employeeCount: created.employeeCount,
      },
    });
    return created;
  }

  @Post('decimo-terceiro/fechamento')
  @RequirePermission('payroll.run.execute')
  @ApiCreatedResponse({ description: 'Generate the closing 13th salary run.' })
  async runDecimoTerceiroFechamento(
    @Req() request: RequestWithContext,
    @Body() body: RunDecimoTerceiroDto,
  ) {
    const created = await this.decimoTerceiroService.runFechamento(
      request.actor?.tenantId ?? request.tenantId ?? '',
      body.year,
    );
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: created.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'decimo_terceiro_fechamento',
        year: body.year,
        employeeCount: created.employeeCount,
      },
    });
    return created;
  }

  @Post('ferias/calcular')
  @RequirePermission(['payroll.run.execute', 'rh.vacation.payout'])
  @ApiCreatedResponse({ description: 'Generate a vacation payroll run.' })
  async runFeriasPayroll(
    @Req() request: RequestWithContext,
    @Body() body: RunFeriasPayrollDto,
  ) {
    const created = await this.feriasPayrollService.run(body.vacationRecordId);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: created.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'ferias',
        vacationRecordId: body.vacationRecordId,
        employeeCount: created.employeeCount,
      },
    });
    return created;
  }
}
