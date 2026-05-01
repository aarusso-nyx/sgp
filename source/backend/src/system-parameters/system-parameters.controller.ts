import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import {
  ToggleFeatureFlagDto,
  UpsertGlobalParameterDto,
  UpsertSystemParametersDto,
} from './system-parameters.dto';
import { SystemParametersService } from './system-parameters.service';

@ApiTags('system-parameters')
@ApiBearerAuth()
@AuditMutation({
  resourceType: 'system_parameter',
  tableName: 'system_parameter',
})
@Controller('v1/admin/parametros')
export class SystemParametersController {
  constructor(
    private readonly systemParametersService: SystemParametersService,
  ) {}

  @Get('sistema')
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'Tenant system parameters.' })
  listSystem() {
    return this.systemParametersService.listSystemParameters();
  }

  @Put('sistema')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Upsert tenant system parameters.' })
  upsertSystem(@Body() body: UpsertSystemParametersDto) {
    return this.systemParametersService.upsertSystemParameters(body);
  }

  @Get('globais')
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'Global parameters.' })
  listGlobal() {
    return this.systemParametersService.listGlobalParameters();
  }

  @Put('globais/:chave')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Upsert one global parameter.' })
  upsertGlobal(
    @Param('chave') chave: string,
    @Body() body: UpsertGlobalParameterDto,
  ) {
    return this.systemParametersService.upsertGlobalParameter(chave, body);
  }
}

@ApiTags('feature-flags')
@ApiBearerAuth()
@Controller('v1/admin/feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly systemParametersService: SystemParametersService,
  ) {}

  @Patch(':chave')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Toggle a tenant feature flag.' })
  toggle(@Param('chave') chave: string, @Body() body: ToggleFeatureFlagDto) {
    return this.systemParametersService.toggleFeatureFlag(chave, body);
  }
}
