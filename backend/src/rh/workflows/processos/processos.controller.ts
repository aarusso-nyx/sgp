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
@AuditMutation({ resourceType: 'rh_workflow' })
@Controller('v1/rh')
export class RhWorkflowProcessesController {
  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET processos' })
  @Get('processos')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List administrative processes.' })
  listProcesses(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow('processes', query);
  }

  @ApiOperation({ summary: 'POST processos' })
  @Post('processos')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Create an administrative process.' })
  async createProcess(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      'processes',
      body,
      body.employeeId,
    );
    await this.auditMutation(
      request,
      'CREATE',
      'administrative_process',
      String(created.id),
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH processos/:id' })
  @Patch('processos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update an administrative process.' })
  async updateProcess(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      'processes',
      id,
      body,
    );
    await this.auditMutation(
      request,
      'UPDATE',
      'administrative_process',
      String(updated.id),
    );
    return updated;
  }

  @ApiOperation({ summary: 'DELETE processos/:id' })
  @Delete('processos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate an administrative process.' })
  async deleteProcess(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      'processes',
      id,
    );
    await this.auditMutation(request, 'DELETE', 'administrative_process', id);
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
