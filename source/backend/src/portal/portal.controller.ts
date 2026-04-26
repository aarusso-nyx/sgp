import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { CurrentActor } from '../auth/current-actor.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuthenticatedActor } from '../auth/auth.types';
import { PortalService } from './portal.service';

@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('portal/v1')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('auth/me')
  @RequirePermissions('auth:read')
  @ApiOkResponse({ description: 'Authenticated portal actor session alias.' })
  authMe(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.currentSession(actor);
  }

  @Get('auth/govbr/status')
  @RequirePermissions('auth:read')
  @ApiOkResponse({ description: 'Gov.br identity provider status.' })
  govBrStatus() {
    return this.portalService.govBrStatus();
  }
}
