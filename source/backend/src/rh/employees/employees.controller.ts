import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { EmployeesService } from './employees.service';
import { TerminateEmployeeDto } from './employees.dto';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService,
  ) {}

  @Get('funcionarios/:id/dossie')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'Employee dossier document.' })
  dossier(@Param('id') id: string) {
    return {
      funcionarioId: id,
      tipo: 'dossie',
      emitidoEm: new Date().toISOString(),
      status: 'AVAILABLE',
    };
  }

  @Get('pericia/prontuarios/:id/laudo/pdf')
  @RequirePermission('saude.read')
  @ApiOkResponse({ description: 'Medical report PDF metadata.' })
  medicalReportPdf(@Param('id') id: string) {
    return {
      prontuarioId: id,
      tipo: 'laudo_pdf',
      status: 'AVAILABLE',
      emitidoEm: new Date().toISOString(),
    };
  }

  @Get('recadastramento/:recadastramento_id/comprovante')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'Recadastramento receipt metadata.' })
  recadastramentoReceipt(
    @Param('recadastramento_id') recadastramentoId: string,
  ) {
    return {
      recadastramentoId,
      tipo: 'comprovante',
      status: 'AVAILABLE',
      emitidoEm: new Date().toISOString(),
    };
  }

  @Post('funcionarios/:func_rescisao/desligamento')
  @RequirePermission('rh.write')
  @ApiOkResponse({
    description:
      'Terminate an employee and optionally create the termination payroll run.',
  })
  async terminateEmployee(
    @Req() request: RequestWithContext,
    @Param('func_rescisao') id: string,
    @Body() body: TerminateEmployeeDto,
  ) {
    const terminated = await this.employeesService.terminate(id, body);
    await this.auditService.auditMutation(request, 'PROCESS', 'employee', {
      resourceId: id,
      tableName: 'employee',
      metadata: {
        transition: 'desligamento',
        payrollRunId: terminated.payrollRunId,
      },
    });
    return terminated;
  }
}
