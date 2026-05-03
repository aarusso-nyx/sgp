import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import {
  CreateLgpdDpoDesignationDto,
  UpdateLgpdDpoDesignationDto,
} from './dpo.dto';
import { LgpdDpoAdminService, LgpdDpoDesignationDto } from './dpo.service';

@ApiTags('lgpd')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'lgpd_dpo_designation',
  tableName: 'public.system_parameter',
})
@Controller('v1/admin/lgpd/dpo')
export class LgpdDpoAdminController {
  constructor(
    private readonly dpoService: LgpdDpoAdminService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET DPO designation' })
  @Get()
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'Read the tenant LGPD DPO designation.' })
  getDesignation() {
    return this.dpoService.getDesignation();
  }

  @ApiOperation({ summary: 'POST DPO designation' })
  @Post()
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({
    description: 'Create or replace the tenant LGPD DPO designation.',
  })
  async createDesignation(
    @Req() request: RequestWithContext,
    @Body() body: CreateLgpdDpoDesignationDto,
  ) {
    const designation = await this.dpoService.createDesignation(body);
    await this.auditDesignation(request, 'CREATE', designation);
    return designation;
  }

  @ApiOperation({ summary: 'PATCH DPO designation' })
  @Patch()
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Patch the tenant LGPD DPO designation.' })
  async updateDesignation(
    @Req() request: RequestWithContext,
    @Body() body: UpdateLgpdDpoDesignationDto,
  ) {
    const designation = await this.dpoService.updateDesignation(body);
    await this.auditDesignation(request, 'UPDATE', designation);
    return designation;
  }

  private auditDesignation(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE',
    designation: LgpdDpoDesignationDto,
  ) {
    return this.auditService.auditMutation(
      request,
      action,
      'lgpd_dpo_designation',
      {
        resourceId: designation.key,
        tableName: 'public.system_parameter',
        metadata: {
          status: designation.lifecycle.status,
          designationAct: designation.lifecycle.designationAct,
          designatedAt: designation.lifecycle.designatedAt,
        },
      },
    );
  }
}
