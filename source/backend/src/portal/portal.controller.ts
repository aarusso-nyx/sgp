import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentActor } from '../auth/current-actor.decorator';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuthenticatedActor } from '../auth/auth.types';
import { PortalService } from './portal.service';

@ApiTags('portal')
@ApiBearerAuth()
@Controller('portal/v1')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('auth/me')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Authenticated portal actor session alias.' })
  authMe(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.currentSession(actor);
  }

  @Get('auth/govbr/status')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Gov.br identity provider status.' })
  govBrStatus() {
    return this.portalService.govBrStatus();
  }
}
