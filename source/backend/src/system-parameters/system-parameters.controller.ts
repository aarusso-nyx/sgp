import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import {
  ToggleFeatureFlagDto,
  UpsertGlobalParameterDto,
  UpsertSystemParametersDto,
} from './system-parameters.dto';
import { SystemParametersService } from './system-parameters.service';

@ApiTags('system-parameters')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
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
  @RequirePermissions('gestao:read')
  @ApiOkResponse({ description: 'Tenant system parameters.' })
  listSystem() {
    return this.systemParametersService.listSystemParameters();
  }

  @Put('sistema')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Upsert tenant system parameters.' })
  upsertSystem(@Body() body: UpsertSystemParametersDto) {
    return this.systemParametersService.upsertSystemParameters(body);
  }

  @Get('globais')
  @RequirePermissions('gestao:read')
  @ApiOkResponse({ description: 'Global parameters.' })
  listGlobal() {
    return this.systemParametersService.listGlobalParameters();
  }

  @Put('globais/:chave')
  @RequirePermissions('gestao:write')
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
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/admin/feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly systemParametersService: SystemParametersService,
  ) {}

  @Patch(':chave')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Toggle a tenant feature flag.' })
  toggle(@Param('chave') chave: string, @Body() body: ToggleFeatureFlagDto) {
    return this.systemParametersService.toggleFeatureFlag(chave, body);
  }
}
