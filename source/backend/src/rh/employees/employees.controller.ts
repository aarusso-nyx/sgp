import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import {
  AdmitEmployeeDto,
  ApproveCadastralChangeDto,
  ChangeContractRegimeDto,
  CreateServiceTimeRecordDto,
  RejectCadastralChangeDto,
  TerminateEmployeeDto,
  UpdateAbonoPermanenciaDto,
} from './employees.dto';
import { EmployeesService } from './employees.service';
import { HistoryService } from './history.service';
import { ServiceTimeService } from './service-time.service';

@ApiTags('rh')
@ApiBearerAuth()
@Controller('v1')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService,
    private readonly historyService: HistoryService,
    private readonly serviceTimeService: ServiceTimeService,
  ) {}

  @Get('funcionarios')
  @RequirePermission('rh.employee.read')
  @ApiOkResponse({ description: 'Paged employee registry.' })
  list(@Query() query: DomainListQueryDto) {
    return this.employeesService.list(query);
  }

  @Get('funcionarios/cadastral-changes')
  @RequirePermission('rh.cadastral_change.approve')
  @ApiOkResponse({ description: 'Pending employee cadastral change requests.' })
  listCadastralChanges(@Query('status') status = 'pending') {
    return this.employeesService.listCadastralChanges(status);
  }

  @Post('funcionarios/cadastral-changes/:id/approve')
  @RequirePermission('rh.cadastral_change.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.cadastral_change_request',
    tableName: 'hr.cadastral_change_request',
  })
  @ApiOkResponse({ description: 'Approve and apply a cadastral change.' })
  approveCadastralChange(
    @Param('id') id: string,
    @Body() body: ApproveCadastralChangeDto,
  ) {
    return this.employeesService.approveCadastralChange(id, body);
  }

  @Post('funcionarios/cadastral-changes/:id/reject')
  @RequirePermission('rh.cadastral_change.approve')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.cadastral_change_request',
    tableName: 'hr.cadastral_change_request',
  })
  @ApiOkResponse({ description: 'Reject a cadastral change.' })
  rejectCadastralChange(
    @Param('id') id: string,
    @Body() body: RejectCadastralChangeDto,
  ) {
    return this.employeesService.rejectCadastralChange(id, body);
  }

  @Post('funcionarios')
  @RequirePermission('rh.employee.admit')
  @ApiCreatedResponse({ description: 'Admit an employee.' })
  async admitEmployee(
    @Req() request: RequestWithContext,
    @Body() body: AdmitEmployeeDto,
  ) {
    const admitted = await this.employeesService.admit(body);
    await this.auditService.auditMutation(request, 'CREATE', 'employee', {
      resourceId: admitted.employeeId,
      tableName: 'employee',
      metadata: {
        transition: 'admission',
        employmentContractId: admitted.employmentContractId,
      },
    });
    return admitted;
  }

  @Get('funcionarios/:id/dossie')
  @RequirePermission('rh.employee.read')
  @ApiOkResponse({ description: 'Employee dossier document.' })
  dossier(@Param('id') id: string) {
    return this.employeesService.getDossier(id);
  }

  @Get('funcionarios/:id/historico')
  @RequirePermission('rh.history.read')
  @ApiOkResponse({ description: 'Immutable employee career timeline.' })
  history(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    return this.historyService.listEmployeeHistory(id, {
      startDate,
      endDate,
      type,
    });
  }

  @Get('funcionarios/:id/tempo-servico')
  @RequirePermission('rh.history.read')
  @ApiOkResponse({ description: 'Employee service-time records.' })
  listServiceTime(@Param('id') id: string) {
    return this.serviceTimeService.list(id);
  }

  @Post('funcionarios/:id/tempo-servico')
  @RequirePermission('rh.employee.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.service_time_record',
    tableName: 'hr.service_time_record',
  })
  @ApiCreatedResponse({
    description: 'Create an employee service-time record.',
  })
  createServiceTime(
    @Param('id') id: string,
    @Body() body: CreateServiceTimeRecordDto,
  ) {
    return this.serviceTimeService.create(id, body);
  }

  @Get('funcionarios/:id/abono-permanencia')
  @RequirePermission('rh.employee.read')
  @ApiOkResponse({ description: 'Employee permanence allowance state.' })
  getAbonoPermanencia(@Param('id') id: string) {
    return this.employeesService.getAbonoPermanencia(id);
  }

  @Post('funcionarios/:id/abono-permanencia')
  @RequirePermission('rh.employee.abono.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'hr.employee.abono_permanencia',
    tableName: 'hr.employee',
  })
  @ApiOkResponse({ description: 'Update employee permanence allowance state.' })
  updateAbonoPermanencia(
    @Param('id') id: string,
    @Body() body: UpdateAbonoPermanenciaDto,
  ) {
    return this.employeesService.updateAbonoPermanencia(id, body);
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
  @RequirePermission('rh.employee.read')
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
  @RequirePermission('rh.employee.terminate')
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

  @Post('funcionarios/:id/vinculos')
  @RequirePermission('rh.employment_link.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'rh.employment_link',
    tableName: 'hr.employment_link',
  })
  @ApiCreatedResponse({ description: 'Change employee legal regime.' })
  changeContractRegime(
    @Param('id') id: string,
    @Body() body: ChangeContractRegimeDto,
  ) {
    return this.employeesService.changeContractRegime(id, body);
  }
}
