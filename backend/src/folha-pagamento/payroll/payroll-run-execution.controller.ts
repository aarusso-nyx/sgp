import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { RunRescisaoDto } from '../rescisao/rescisao.dto';
import { RescisaoService } from '../rescisao/rescisao.service';
import { DecimoTerceiroService } from './decimo-terceiro.service';
import { FeriasPayrollService } from './ferias-payroll.service';
import { RunDecimoTerceiroDto, RunFeriasPayrollDto } from './payroll.dto';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/folhas')
export class PayrollRunExecutionController {
  constructor(
    private readonly decimoTerceiroService: DecimoTerceiroService,
    private readonly feriasPayrollService: FeriasPayrollService,
    private readonly rescisaoService: RescisaoService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST decimo-terceiro/adiantamento' })
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

  @ApiOperation({ summary: 'POST decimo-terceiro/fechamento' })
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

  @ApiOperation({ summary: 'POST ferias/calcular' })
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

  @ApiOperation({ summary: 'POST rescisao/calcular' })
  @Post('rescisao/calcular')
  @RequirePermission(['payroll.run.execute', 'rh.employee.terminate'])
  @ApiCreatedResponse({ description: 'Generate a termination payroll run.' })
  async runRescisaoPayroll(
    @Req() request: RequestWithContext,
    @Body() body: RunRescisaoDto,
  ) {
    const created = await this.rescisaoService.run(
      body.employmentLinkId,
      body.terminationDate,
      body.cause,
      body.priorNoticeKind,
      body.priorNoticeReductionMode ?? 'NONE',
    );
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: created.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'rescisao',
        employmentLinkId: body.employmentLinkId,
        terminationDate: body.terminationDate,
        cause: body.cause,
        employeeCount: created.employeeCount,
      },
    });
    return created;
  }
}
