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
export class RhWorkflowProcessFunctionsController {
  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET processos-funcao' })
  @Get('processos-funcao')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List process to function assignments.' })
  listProcessFunctions(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow('process-functions', query);
  }

  @ApiOperation({ summary: 'POST processos-funcao' })
  @Post('processos-funcao')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({
    description: 'Create a process to function assignment.',
  })
  async createProcessFunction(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      'process-functions',
      body,
      body.employeeId,
    );
    await this.auditMutation(
      request,
      'CREATE',
      'administrative_process_function',
      String(created.id),
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH processos-funcao/:id' })
  @Patch('processos-funcao/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update a process to function assignment.' })
  async updateProcessFunction(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      'process-functions',
      id,
      body,
    );
    await this.auditMutation(
      request,
      'UPDATE',
      'administrative_process_function',
      String(updated.id),
    );
    return updated;
  }

  @ApiOperation({ summary: 'DELETE processos-funcao/:id' })
  @Delete('processos-funcao/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({
    description: 'Deactivate a process to function assignment.',
  })
  async deleteProcessFunction(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      'process-functions',
      id,
    );
    await this.auditMutation(
      request,
      'DELETE',
      'administrative_process_function',
      id,
    );
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
