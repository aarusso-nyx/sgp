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
  resourceType: 'employee_exercise',
  tableName: 'employee_exercise',
})
@Controller('v1/employees/:employeeId/rh-workflows')
export class ExercisesWorkflowController {
  private readonly workflow = 'exercises';
  private readonly tableName = 'employee_exercise';

  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET exercicios' })
  @Get('exercicios')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List exercise assignments for an employee.' })
  listExercises(
    @Param('employeeId') employeeId: string,
    @Query() query: DomainListQueryDto,
  ) {
    return this.workflowsService.listWorkflow(this.workflow, query, employeeId);
  }

  @ApiOperation({ summary: 'POST exercicios' })
  @Post('exercicios')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create an exercise assignment.' })
  createExercise(
    @Req() request: RequestWithContext,
    @Param('employeeId') employeeId: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.createEmployeeWorkflow(request, employeeId, body);
  }

  @ApiOperation({ summary: 'PATCH exercicios/:id' })
  @Patch('exercicios/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update an exercise assignment.' })
  updateExercise(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    return this.updateEmployeeWorkflow(request, id, body);
  }

  @ApiOperation({ summary: 'DELETE exercicios/:id' })
  @Delete('exercicios/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate an exercise assignment.' })
  deleteExercise(@Req() request: RequestWithContext, @Param('id') id: string) {
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
