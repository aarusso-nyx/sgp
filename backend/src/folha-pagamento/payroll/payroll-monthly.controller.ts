import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { FolhaMensalService } from './folha-mensal.service';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@ApiTags('folha-pagamento')
@ApiBearerAuth()
@Controller('v1/folhas')
export class PayrollMonthlyController {
  constructor(
    private readonly folhaMensalService: FolhaMensalService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'POST mensal/abrir' })
  @Post('mensal/abrir')
  @RequirePermission(['payroll.run.execute', 'folha.write'])
  @ApiCreatedResponse({ description: 'Open a monthly payroll competence.' })
  async openMonthlyCompetence(
    @Req() request: RequestWithContext,
    @Body() body: FolhaMensalCompetenceDto,
  ) {
    const result = await this.folhaMensalService.openCompetence(body);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: result.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'monthly.opened',
        year: body.year,
        month: body.month,
      },
    });
    return result;
  }

  @ApiOperation({ summary: 'POST mensal/calcular' })
  @Post('mensal/calcular')
  @RequirePermission(['payroll.run.execute', 'folha.write'])
  @ApiOkResponse({ description: 'Calculate a monthly payroll competence.' })
  async calculateMonthlyCompetence(
    @Req() request: RequestWithContext,
    @Body() body: FolhaMensalCompetenceDto,
  ) {
    const result = await this.folhaMensalService.calculate(body);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: result.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'monthly.calculated',
        year: body.year,
        month: body.month,
      },
    });
    return result;
  }

  @ApiOperation({ summary: 'POST mensal/aprovar' })
  @Post('mensal/aprovar')
  @RequirePermission(['payroll.run.execute', 'folha.write'])
  @ApiOkResponse({ description: 'Approve a monthly payroll competence.' })
  async approveMonthlyCompetence(
    @Req() request: RequestWithContext,
    @Body() body: FolhaMensalCompetenceDto,
  ) {
    const result = await this.folhaMensalService.approve(body);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: result.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'monthly.approved',
        year: body.year,
        month: body.month,
      },
    });
    return result;
  }

  @ApiOperation({ summary: 'POST mensal/gerar' })
  @Post('mensal/gerar')
  @RequirePermission(['payroll.run.execute', 'folha.write'])
  @ApiOkResponse({ description: 'Generate monthly employee paystubs.' })
  async generateMonthlyPaystubs(
    @Req() request: RequestWithContext,
    @Body() body: FolhaMensalCompetenceDto,
  ) {
    const result = await this.folhaMensalService.generate(body);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: result.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'monthly.generated',
        year: body.year,
        month: body.month,
      },
    });
    return result;
  }

  @ApiOperation({ summary: 'POST mensal/fechar' })
  @Post('mensal/fechar')
  @RequirePermission(['payroll.run.execute', 'folha.write'])
  @ApiOkResponse({ description: 'Close a monthly payroll competence.' })
  async closeMonthlyCompetence(
    @Req() request: RequestWithContext,
    @Body() body: FolhaMensalCompetenceDto,
  ) {
    const result = await this.folhaMensalService.close(body);
    await this.auditService.auditMutation(request, 'PROCESS', 'payroll_run', {
      resourceId: result.payrollRunId,
      tableName: 'payroll_run',
      metadata: {
        operation: 'monthly.closed',
        year: body.year,
        month: body.month,
      },
    });
    return result;
  }

  @ApiOperation({ summary: 'GET mensal/revisao' })
  @Get('mensal/revisao')
  @RequirePermission(['payroll.run.execute', 'folha.read'])
  @ApiOkResponse({ description: 'Review monthly payroll totals by employee.' })
  reviewMonthlyCompetence(@Query() query: FolhaMensalCompetenceDto) {
    return this.folhaMensalService.review(query);
  }
}
