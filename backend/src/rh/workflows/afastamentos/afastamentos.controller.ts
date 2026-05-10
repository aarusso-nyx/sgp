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
export class RhWorkflowLeavesController {
  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET afastamentos' })
  @Get('afastamentos')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List employee leave and absence records.' })
  listLeaves(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow('leaves', query);
  }

  @ApiOperation({ summary: 'POST afastamentos' })
  @Post('afastamentos')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({ description: 'Register an employee leave entry.' })
  async createLeave(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      'leaves',
      body,
      body.employeeId,
    );
    await this.auditMutation(
      request,
      'CREATE',
      'leave_record',
      String(created.id),
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH afastamentos/:id' })
  @Patch('afastamentos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Update an employee leave record.' })
  async updateLeave(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      'leaves',
      id,
      body,
    );
    await this.auditMutation(
      request,
      'UPDATE',
      'leave_record',
      String(updated.id),
    );
    return updated;
  }

  @ApiOperation({ summary: 'DELETE afastamentos/:id' })
  @Delete('afastamentos/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({ description: 'Deactivate an employee leave record.' })
  async deleteLeave(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      'leaves',
      id,
    );
    await this.auditMutation(request, 'DELETE', 'leave_record', id);
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
