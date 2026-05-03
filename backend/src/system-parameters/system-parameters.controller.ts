import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import {
  ToggleFeatureFlagDto,
  UpsertAtsParameterDto,
  UpsertGlobalParameterDto,
  UpsertRemunerationCeilingDto,
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

  @ApiOperation({ summary: 'GET sistema' })
  @Get('sistema')
  @RequirePermission('gestao.read')
  @ApiOkResponse({ description: 'Tenant system parameters.' })
  listSystem() {
    return this.systemParametersService.listSystemParameters();
  }

  @ApiOperation({ summary: 'PUT sistema' })
  @Put('sistema')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Upsert tenant system parameters.' })
  upsertSystem(@Body() body: UpsertSystemParametersDto) {
    return this.systemParametersService.upsertSystemParameters(body);
  }

  @ApiOperation({ summary: 'GET globais' })
  @Get('globais')
  @RequirePermission('system.parameter.read')
  @ApiOkResponse({ description: 'Global parameters.' })
  listGlobal() {
    return this.systemParametersService.listGlobalParameters();
  }

  @ApiOperation({ summary: 'PUT globais/:chave' })
  @Put('globais/:chave')
  @RequirePermission('system.parameter.write')
  @ApiOkResponse({ description: 'Upsert one global parameter.' })
  upsertGlobal(
    @Param('chave') chave: string,
    @Body() body: UpsertGlobalParameterDto,
  ) {
    return this.systemParametersService.upsertGlobalParameter(chave, body);
  }

  @ApiOperation({ summary: 'GET teto-remuneratorio' })
  @Get('teto-remuneratorio')
  @RequirePermission('system.parameter.read')
  @ApiOkResponse({ description: 'Tenant remuneration ceiling parameters.' })
  listRemunerationCeilings() {
    return this.systemParametersService.listRemunerationCeilings();
  }

  @ApiOperation({ summary: 'PUT teto-remuneratorio' })
  @Put('teto-remuneratorio')
  @RequirePermission('system.parameter.write')
  @ApiOkResponse({ description: 'Upsert one remuneration ceiling parameter.' })
  upsertRemunerationCeiling(@Body() body: UpsertRemunerationCeilingDto) {
    return this.systemParametersService.upsertRemunerationCeiling(body);
  }

  @ApiOperation({ summary: 'GET ats' })
  @Get('ats')
  @RequirePermission('system.parameter.read')
  @ApiOkResponse({ description: 'Tenant ATS and sixth-part parameters.' })
  listAtsParameters() {
    return this.systemParametersService.listAtsParameters();
  }

  @ApiOperation({ summary: 'PUT ats' })
  @Put('ats')
  @RequirePermission('system.parameter.write')
  @ApiOkResponse({ description: 'Upsert one ATS or sixth-part parameter.' })
  upsertAtsParameter(@Body() body: UpsertAtsParameterDto) {
    return this.systemParametersService.upsertAtsParameter(body);
  }
}

@ApiTags('feature-flags')
@ApiBearerAuth()
@Controller('v1/admin/feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly systemParametersService: SystemParametersService,
  ) {}

  @ApiOperation({ summary: 'PATCH :chave' })
  @Patch(':chave')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Toggle a tenant feature flag.' })
  toggle(@Param('chave') chave: string, @Body() body: ToggleFeatureFlagDto) {
    return this.systemParametersService.toggleFeatureFlag(chave, body);
  }
}
