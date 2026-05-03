import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  PreconditionFailedException,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

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

  @ApiOperation({ summary: 'GET funcionarios' })
  @Get('funcionarios')
  @RequirePermission('rh.employee.read')
  @ApiOkResponse({ description: 'Paged employee registry.' })
  list(@Query() query: DomainListQueryDto) {
    return this.employeesService.list(query);
  }

  @ApiOperation({ summary: 'GET funcionarios/cadastral-changes' })
  @Get('funcionarios/cadastral-changes')
  @RequirePermission('rh.cadastral_change.approve')
  @ApiOkResponse({ description: 'Pending employee cadastral change requests.' })
  listCadastralChanges(@Query('status') status = 'pending') {
    return this.employeesService.listCadastralChanges(status);
  }

  @ApiOperation({ summary: 'POST funcionarios/cadastral-changes/:id/approve' })
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

  @ApiOperation({ summary: 'POST funcionarios/cadastral-changes/:id/reject' })
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

  @ApiOperation({ summary: 'POST funcionarios' })
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

  @ApiOperation({ summary: 'GET funcionarios/:id/dossie' })
  @Get('funcionarios/:id/dossie')
  @RequirePermission('rh.employee.read')
  @ApiOkResponse({ description: 'Employee dossier document.' })
  dossier(@Param('id') id: string) {
    return this.employeesService.getDossier(id);
  }

  @ApiOperation({ summary: 'GET funcionarios/:id/historico' })
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

  @ApiOperation({ summary: 'GET funcionarios/:id/tempo-servico' })
  @Get('funcionarios/:id/tempo-servico')
  @RequirePermission('rh.history.read')
  @ApiOkResponse({ description: 'Employee service-time records.' })
  listServiceTime(@Param('id') id: string) {
    return this.serviceTimeService.list(id);
  }

  @ApiOperation({ summary: 'POST funcionarios/:id/tempo-servico' })
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

  @ApiOperation({ summary: 'GET funcionarios/:id/abono-permanencia' })
  @Get('funcionarios/:id/abono-permanencia')
  @RequirePermission('rh.employee.read')
  @ApiOkResponse({ description: 'Employee permanence allowance state.' })
  async getAbonoPermanencia(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.employeesService.getAbonoPermanencia(id);
    this.setEtag(response, result);
    return result;
  }

  @ApiOperation({ summary: 'POST funcionarios/:id/abono-permanencia' })
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
    @Headers('if-match') ifMatch: string | string[] | undefined,
    @Body() body: UpdateAbonoPermanenciaDto,
  ) {
    return this.employeesService.updateAbonoPermanencia(
      id,
      body,
      this.parseIfMatch(ifMatch),
    );
  }

  @ApiOperation({ summary: 'GET pericia/prontuarios/:id/laudo/pdf' })
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

  @ApiOperation({
    summary: 'GET recadastramento/:recadastramento_id/comprovante',
  })
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

  @ApiOperation({ summary: 'POST funcionarios/:func_rescisao/desligamento' })
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

  @ApiOperation({ summary: 'POST funcionarios/:id/vinculos' })
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
    @Headers('if-match') ifMatch: string | string[] | undefined,
    @Body() body: ChangeContractRegimeDto,
  ) {
    return this.employeesService.changeContractRegime(
      id,
      body,
      this.parseIfMatch(ifMatch),
    );
  }

  private parseIfMatch(value: string | string[] | undefined): number {
    const header = Array.isArray(value) ? value[0] : value;
    const trimmed = header?.trim();
    if (!trimmed) {
      throw new PreconditionFailedException('If-Match header is required');
    }

    const match = /^"?(?<version>\d+)"?$/.exec(trimmed);
    if (!match?.groups?.version) {
      throw new PreconditionFailedException(
        'If-Match header must contain a numeric version ETag',
      );
    }
    return Number(match.groups.version);
  }

  private setEtag(
    response: Response,
    value: Record<string, unknown> & { version?: unknown },
  ): void {
    if (value.version === undefined) return;
    response.setHeader('ETag', `"${Number(value.version)}"`);
  }
}
