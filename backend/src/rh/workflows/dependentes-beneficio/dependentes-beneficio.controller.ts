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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../../common/audit/audit-mutation.decorator';
import { DomainListQueryDto } from '../../../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../../../common/request-id/request-with-context';
import { RequirePermission } from '../../../iam/decorators/require-permission.decorator';
import { AuditService } from '../../../audit/audit.service';
import { RhWorkflowMutationDto } from '../rh-workflows.dto';
import { RhWorkflowsService } from '../rh-workflows.service';

@ApiTags('rh')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'employee_benefit_dependent',
  tableName: 'employee_benefit_dependent',
})
@Controller('v1/employees/:employeeId/rh-workflows')
export class BenefitDependentsWorkflowController {
  private readonly workflow = 'benefit-dependents';
  private readonly tableName = 'employee_benefit_dependent';

  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET dependentes-beneficio' })
  @Get('dependentes-beneficio')
  @RequirePermission('rh.read')
  @ApiOkResponse({
    description: 'List benefit-dependent records for an employee.',
  })
  listBenefitDependents(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(this.workflow, query, employeeId);
  }

  @ApiOperation({ summary: 'POST dependentes-beneficio' })
  @Post('dependentes-beneficio')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create a benefit-dependent record.' })
  createBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(request, employeeId, body);
  }

  @ApiOperation({ summary: 'PATCH dependentes-beneficio/:id' })
  @Patch('dependentes-beneficio/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update a benefit-dependent record.' })
  updateBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE dependentes-beneficio/:id' })
  @Delete('dependentes-beneficio/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate a benefit-dependent record.' })
  deleteBenefitDependent(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    return this.deleteEmployeeWorkflow(request, id);
  }

  private async createEmployeeWorkflow(
    request: RequestWithContext,
    employeeId: string,
    body: RhWorkflowMutationDto,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      this.workflow,
      body,
      employeeId,
    );
    await this.auditMutation(request, 'CREATE', String(created.id));
    return created;
  }

  private async updateEmployeeWorkflow(
    request: RequestWithContext,
    id: string,
    body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      this.workflow,
      id,
      body,
    );
    await this.auditMutation(request, 'UPDATE', String(updated.id));
    return updated;
  }

  private async deleteEmployeeWorkflow(
    request: RequestWithContext,
    id: string,
  ) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      this.workflow,
      id,
    );
    await this.auditMutation(request, 'DELETE', id);
    return deleted;
  }

  private auditMutation(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceId: string,
  ) {
    return this.auditService.auditMutation(request, action, this.tableName, {
      resourceId,
      tableName: this.tableName,
    });
  }
}
