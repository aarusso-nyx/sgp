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
export class RhWorkflowProfessionalExperiencesController {
  constructor(
    private readonly workflowsService: RhWorkflowsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET professional-experiences' })
  @Get('professional-experiences')
  @RequirePermission('rh.read')
  @ApiOkResponse({ description: 'List prior professional experience records.' })
  listProfessionalExperiences(@Query() query: DomainListQueryDto) {
    return this.workflowsService.listWorkflow(
      'professional-experiences',
      query,
    );
  }

  @ApiOperation({ summary: 'POST professional-experiences' })
  @Post('professional-experiences')
  @RequirePermission('rh.write')
  @ApiCreatedResponse({
    description: 'Create a prior professional experience record.',
  })
  async createProfessionalExperience(
    @Req() request: RequestWithContext,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const created = await this.workflowsService.createWorkflowRecord(
      'professional-experiences',
      body,
      body.employeeId,
    );
    await this.auditMutation(
      request,
      'CREATE',
      'professional_experience',
      String(created.id),
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH professional-experiences/:id' })
  @Patch('professional-experiences/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({
    description: 'Update a prior professional experience record.',
  })
  async updateProfessionalExperience(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: RhWorkflowMutationDto,
  ) {
    const updated = await this.workflowsService.updateWorkflowRecord(
      'professional-experiences',
      id,
      body,
    );
    await this.auditMutation(
      request,
      'UPDATE',
      'professional_experience',
      String(updated.id),
    );
    return updated;
  }

  @ApiOperation({ summary: 'DELETE professional-experiences/:id' })
  @Delete('professional-experiences/:id')
  @RequirePermission('rh.write')
  @ApiOkResponse({
    description: 'Deactivate a prior professional experience record.',
  })
  async deleteProfessionalExperience(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const deleted = await this.workflowsService.deleteWorkflowRecord(
      'professional-experiences',
      id,
    );
    await this.auditMutation(request, 'DELETE', 'professional_experience', id);
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
