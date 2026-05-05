import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthenticatedActor } from '../actor.types';
import { CurrentActor } from '../current-actor.decorator';
import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import {
  Public,
  RequirePermission,
} from '../../iam/decorators/require-permission.decorator';
import { SessionService } from './session.service';

@ApiTags('auth')
@AuditMutation({ resourceType: 'auth_session', tableName: 'user_account' })
@Controller('v1/auth')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @ApiOperation({ summary: 'GET me' })
  @Get('me')
  @RequirePermission('auth.read')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Current authenticated Cognito actor.' })
  me(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.sessionService.currentSession(actor);
  }

  @ApiOperation({ summary: 'GET menus' })
  @Get('menus')
  @RequirePermission('auth.read')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Resolved menu entries for the authenticated actor.',
  })
  menus(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.sessionService.currentMenus(actor);
  }

  @ApiOperation({ summary: 'POST logout' })
  @Post('logout')
  @RequirePermission('auth.read')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Invalidate current actor session.' })
  logout(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.sessionService.logout(actor);
  }

  @ApiOperation({ summary: 'POST recuperar-senha' })
  @Post('recuperar-senha')
  @Public()
  @ApiCreatedResponse({ description: 'Start password recovery flow.' })
  recoverPassword(
    @Body()
    body: {
      login?: string;
      email?: string;
    },
  ) {
    return this.sessionService.recoverPassword(body);
  }

  @ApiOperation({ summary: 'POST confirmar-nova-senha' })
  @Post('confirmar-nova-senha')
  @Public()
  @ApiCreatedResponse({ description: 'Confirm recovered password.' })
  confirmNewPassword(
    @Body()
    body: {
      token: string;
      novaSenha: string;
    },
  ) {
    return this.sessionService.confirmNewPassword(body);
  }

  @ApiOperation({ summary: 'PUT alterar-senha' })
  @Put('alterar-senha')
  @RequirePermission('auth.read')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Change current actor password.' })
  changePassword(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Body()
    body: { senhaAtual: string; novaSenha: string },
  ) {
    return this.sessionService.changePassword(actor, body);
  }
}
