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
import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import { RhWorkflowMutationDto } from './rh-workflows.dto';
import { RhWorkflowsService } from './rh-workflows.service';

@ApiTags('rh')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@AuditMutation({ resourceType: 'rh_workflow' })
@Controller('v1/rh')
export class RhWorkflowsController {
  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('afastamentos')
  @RequirePermissions('rh:read')
  @ApiOkResponse({ description: 'List employee leave and absence records.' })
  listLeaves(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow('leaves', query);
  }

  @Post('afastamentos')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({ description: 'Register an employee leave entry.' })
  async createLeave(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createGlobalWorkflow(request, 'leaves', 'leave_record', body);
  }

  @Patch('afastamentos/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update an employee leave record.' })
  async updateLeave(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateGlobalWorkflow(
      request,
      'leaves',
      'leave_record',
      id,
      body,
    );
  }

  @Delete('afastamentos/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Deactivate an employee leave record.' })
  async deleteLeave(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteGlobalWorkflow(request, 'leaves', 'leave_record', id);
  }

  @Get('processos')
  @RequirePermissions('rh:read')
  @ApiOkResponse({ description: 'List administrative processes.' })
  listProcesses(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow('processes', query);
  }

  @Post('processos')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({ description: 'Create an administrative process.' })
  async createProcess(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createGlobalWorkflow(
      request,
      'processes',
      'administrative_process',
      body,
    );
  }

  @Patch('processos/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update an administrative process.' })
  async updateProcess(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateGlobalWorkflow(
      request,
      'processes',
      'administrative_process',
      id,
      body,
    );
  }

  @Delete('processos/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Deactivate an administrative process.' })
  async deleteProcess(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteGlobalWorkflow(
      request,
      'processes',
      'administrative_process',
      id,
    );
  }

  @Get('processos-funcao')
  @RequirePermissions('rh:read')
  @ApiOkResponse({ description: 'List process to function assignments.' })
  listProcessFunctions(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow('process-functions', query);
  }

  @Post('processos-funcao')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({
    description: 'Create a process to function assignment.',
  })
  async createProcessFunction(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createGlobalWorkflow(
      request,
      'process-functions',
      'administrative_process_function',
      body,
    );
  }

  @Patch('processos-funcao/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update a process to function assignment.' })
  async updateProcessFunction(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateGlobalWorkflow(
      request,
      'process-functions',
      'administrative_process_function',
      id,
      body,
    );
  }

  @Delete('processos-funcao/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({
    description: 'Deactivate a process to function assignment.',
  })
  async deleteProcessFunction(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteGlobalWorkflow(
      request,
      'process-functions',
      'administrative_process_function',
      id,
    );
  }

  private async createGlobalWorkflow(
    request: RequestWithContext,
    workflow: string,
    tableName: string,
    body: RhWorkflowMutationDto,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      workflow,
      body,
      body.employeeId,
    );
    await this.auditMutation(request, 'CREATE', tableName, String(created.id));
    return created;
  }

  private async updateGlobalWorkflow(
    request: RequestWithContext,
    workflow: string,
    tableName: string,
    id: string,
    body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      workflow,
      id,
      body,
    );
    await this.auditMutation(request, 'UPDATE', tableName, String(updated.id));
    return updated;
  }

  private async deleteGlobalWorkflow(
    request: RequestWithContext,
    workflow: string,
    tableName: string,
    id: string,
  ) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      workflow,
      id,
    );
    await this.auditMutation(request, 'DELETE', tableName, id);
    return deleted;
  }

  private auditMutation(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    resourceId: string,
  ) {
    return this.auditService.auditMutation(request, action, tableName, {
      resourceId,
      tableName,
    });
  }
}

@ApiTags('rh')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/employees/:employeeId/rh-workflows')
export class EmployeeRhWorkflowsController {
  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('dependentes-beneficio')
  @RequirePermissions('rh:read')
  @ApiOkResponse({
    description: 'List benefit-dependent records for an employee.',
  })
  listBenefitDependents(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(
      'benefit-dependents',
      query,
      employeeId,
    );
  }

  @Post('dependentes-beneficio')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({ description: 'Create a benefit-dependent record.' })
  createBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(
      request,
      'benefit-dependents',
      'employee_benefit_dependent',
      employeeId,
      body,
    );
  }

  @Patch('dependentes-beneficio/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update a benefit-dependent record.' })
  updateBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(
      request,
      'benefit-dependents',
      'employee_benefit_dependent',
      id,
      body,
    );
  }

  @Delete('dependentes-beneficio/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Deactivate a benefit-dependent record.' })
  deleteBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteEmployeeWorkflow(
      request,
      'benefit-dependents',
      'employee_benefit_dependent',
      id,
    );
  }

  @Get('contribuicoes-sindicais')
  @RequirePermissions('rh:read')
  @ApiOkResponse({
    description: 'List union contribution records for an employee.',
  })
  listUnionContributions(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(
      'union-contributions',
      query,
      employeeId,
    );
  }

  @Post('contribuicoes-sindicais')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({ description: 'Create a union contribution record.' })
  createUnionContribution(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(
      request,
      'union-contributions',
      'employee_union_contribution',
      employeeId,
      body,
    );
  }

  @Patch('contribuicoes-sindicais/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update a union contribution record.' })
  updateUnionContribution(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(
      request,
      'union-contributions',
      'employee_union_contribution',
      id,
      body,
    );
  }

  @Delete('contribuicoes-sindicais/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Deactivate a union contribution record.' })
  deleteUnionContribution(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteEmployeeWorkflow(
      request,
      'union-contributions',
      'employee_union_contribution',
      id,
    );
  }

  @Get('exercicios')
  @RequirePermissions('rh:read')
  @ApiOkResponse({ description: 'List exercise assignments for an employee.' })
  listExercises(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow('exercises', query, employeeId);
  }

  @Post('exercicios')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({ description: 'Create an exercise assignment.' })
  createExercise(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(
      request,
      'exercises',
      'employee_exercise',
      employeeId,
      body,
    );
  }

  @Patch('exercicios/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update an exercise assignment.' })
  updateExercise(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(
      request,
      'exercises',
      'employee_exercise',
      id,
      body,
    );
  }

  @Delete('exercicios/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Deactivate an exercise assignment.' })
  deleteExercise(@Req() request: RequestWithContext, @Param('id') id: string) {
    return this.deleteEmployeeWorkflow(
      request,
      'exercises',
      'employee_exercise',
      id,
    );
  }

  @Get('pensoes-alimenticias')
  @RequirePermissions('rh:read')
  @ApiOkResponse({ description: 'List alimony records for an employee.' })
  listAlimonies(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow('alimonies', query, employeeId);
  }

  @Post('pensoes-alimenticias')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({ description: 'Create an alimony record.' })
  createAlimony(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(
      request,
      'alimonies',
      'employee_alimony',
      employeeId,
      body,
    );
  }

  @Patch('pensoes-alimenticias/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update an alimony record.' })
  updateAlimony(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(
      request,
      'alimonies',
      'employee_alimony',
      id,
      body,
    );
  }

  @Delete('pensoes-alimenticias/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Deactivate an alimony record.' })
  deleteAlimony(@Req() request: RequestWithContext, @Param('id') id: string) {
    return this.deleteEmployeeWorkflow(
      request,
      'alimonies',
      'employee_alimony',
      id,
    );
  }

  @Get('vales-transporte')
  @RequirePermissions('rh:read')
  @ApiOkResponse({
    description: 'List transit benefit grants for an employee.',
  })
  listTransitBenefits(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(
      'transit-benefits',
      query,
      employeeId,
    );
  }

  @Post('vales-transporte')
  @RequirePermissions('rh:write')
  @ApiCreatedResponse({ description: 'Create a transit benefit grant.' })
  createTransitBenefit(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(
      request,
      'transit-benefits',
      'employee_transit_benefit',
      employeeId,
      body,
    );
  }

  @Patch('vales-transporte/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Update a transit benefit grant.' })
  updateTransitBenefit(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(
      request,
      'transit-benefits',
      'employee_transit_benefit',
      id,
      body,
    );
  }

  @Delete('vales-transporte/:id')
  @RequirePermissions('rh:write')
  @ApiOkResponse({ description: 'Deactivate a transit benefit grant.' })
  deleteTransitBenefit(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteEmployeeWorkflow(
      request,
      'transit-benefits',
      'employee_transit_benefit',
      id,
    );
  }

  private async createEmployeeWorkflow(
    request: RequestWithContext,
    workflow: string,
    tableName: string,
    employeeId: string,
    body: RhWorkflowMutationDto,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      workflow,
      body,
      employeeId,
    );
    await this.auditMutation(request, 'CREATE', tableName, String(created.id));
    return created;
  }

  private async updateEmployeeWorkflow(
    request: RequestWithContext,
    workflow: string,
    tableName: string,
    id: string,
    body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      workflow,
      id,
      body,
    );
    await this.auditMutation(request, 'UPDATE', tableName, String(updated.id));
    return updated;
  }

  private async deleteEmployeeWorkflow(
    request: RequestWithContext,
    workflow: string,
    tableName: string,
    id: string,
  ) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      workflow,
      id,
    );
    await this.auditMutation(request, 'DELETE', tableName, id);
    return deleted;
  }

  private auditMutation(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    resourceId: string,
  ) {
    return this.auditService.auditMutation(request, action, tableName, {
      resourceId,
      tableName,
    });
  }
}
