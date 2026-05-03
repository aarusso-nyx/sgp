import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { ToggleFeatureFlagDto } from './system-parameters.dto';
import { SystemParametersService } from './system-parameters.service';
import { AdminPlatformService } from './admin-platform.service';

@ApiTags('admin')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'admin_platform' })
@Controller('admin/v1')
export class AdminPlatformController {
  constructor(
    private readonly systemParametersService: SystemParametersService,
    private readonly adminPlatformService: AdminPlatformService,
  ) {}

  @ApiOperation({ summary: 'PATCH feature-flags/:chave' })
  @Patch('feature-flags/:chave')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Toggle feature flag from admin namespace.' })
  toggleFeatureFlag(
    @Param('chave') chave: string,
    @Body() body: ToggleFeatureFlagDto,
  ) {
    return this.systemParametersService.toggleFeatureFlag(chave, body);
  }

  @ApiOperation({ summary: 'POST tenants' })
  @Post('tenants')
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Create tenant.' })
  createTenant(@Body() body: Record<string, unknown>) {
    return this.adminPlatformService.createTenant(body);
  }

  @ApiOperation({ summary: 'PATCH tenants/:id' })
  @Patch('tenants/:id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Patch tenant.' })
  patchTenant(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminPlatformService.patchTenant(id, body);
  }

  @ApiOperation({ summary: 'POST tenants/:id/importacao' })
  @Post('tenants/:id/importacao')
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Start tenant import job.' })
  startImport(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminPlatformService.startTenantImport(id, body);
  }

  @ApiOperation({ summary: 'GET tenants/:id/importacao/:job_id/progresso' })
  @Get('tenants/:id/importacao/:job_id/progresso')
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'Tenant import progress.' })
  importProgress(@Param('id') id: string, @Param('job_id') jobId: string) {
    return this.adminPlatformService.importProgress(id, jobId);
  }

  @ApiOperation({ summary: 'POST esocial/eventos/:id/reprocessar' })
  @Post('esocial/eventos/:id/reprocessar')
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Reprocess eSocial event.' })
  reprocessEsocialEvent(@Param('id') id: string) {
    return this.adminPlatformService.reprocessEsocialEvent(id);
  }

  @ApiOperation({ summary: 'PUT esocial/certificado' })
  @Put('esocial/certificado')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Update eSocial certificate.' })
  updateEsocialCertificate(@Body() body: Record<string, unknown>) {
    return this.adminPlatformService.updateEsocialCertificate(body);
  }
}
