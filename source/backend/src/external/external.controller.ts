import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ExternalService } from './external.service';

@ApiTags('external')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('external/v1')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @Get('dados')
  @RequirePermissions('auth:read')
  @ApiOkResponse({ description: 'External API health/data probe.' })
  dados() {
    return this.externalService.dados();
  }

  @Get('dicionario/entidades')
  @RequirePermissions('auth:read')
  @ApiOkResponse({ description: 'External API entity dictionary.' })
  entidades() {
    return this.externalService.entidades();
  }
}
