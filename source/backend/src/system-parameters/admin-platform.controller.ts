import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import {
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

  @Patch('feature-flags/:chave')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Toggle feature flag from admin namespace.' })
  toggleFeatureFlag(
    @Param('chave') chave: string,
    @Body() body: ToggleFeatureFlagDto,
  ) {
    return this.systemParametersService.toggleFeatureFlag(chave, body);
  }

  @Post('tenants')
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Create tenant.' })
  createTenant(@Body() body: Record<string, unknown>) {
    return this.adminPlatformService.createTenant(body);
  }

  @Patch('tenants/:id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Patch tenant.' })
  patchTenant(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminPlatformService.patchTenant(id, body);
  }

  @Post('tenants/:id/importacao')
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Start tenant import job.' })
  startImport(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminPlatformService.startTenantImport(id, body);
  }

  @Get('tenants/:id/importacao/:job_id/progresso')
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'Tenant import progress.' })
  importProgress(@Param('id') id: string, @Param('job_id') jobId: string) {
    return this.adminPlatformService.importProgress(id, jobId);
  }

  @Post('esocial/eventos/:id/reprocessar')
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Reprocess eSocial event.' })
  reprocessEsocialEvent(@Param('id') id: string) {
    return this.adminPlatformService.reprocessEsocialEvent(id);
  }

  @Put('esocial/certificado')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Update eSocial certificate.' })
  updateEsocialCertificate(@Body() body: Record<string, unknown>) {
    return this.adminPlatformService.updateEsocialCertificate(body);
  }
}
