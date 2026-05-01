import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthenticatedActor } from '../auth.types';
import { CognitoJwtGuard } from '../cognito-jwt.guard';
import { CurrentActor } from '../current-actor.decorator';
import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { SessionService } from './session.service';

@ApiTags('auth')
@AuditMutation({ resourceType: 'auth_session', tableName: 'user_account' })
@Controller('v1/auth')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Current authenticated Cognito actor.' })
  @UseGuards(CognitoJwtGuard)
  me(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.sessionService.currentSession(actor);
  }

  @Get('menus')
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Resolved menu entries for the authenticated actor.',
  })
  @UseGuards(CognitoJwtGuard)
  menus(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.sessionService.currentMenus(actor);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Invalidate current actor session.' })
  @UseGuards(CognitoJwtGuard)
  logout(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.sessionService.logout(actor);
  }

  @Post('recuperar-senha')
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

  @Post('confirmar-nova-senha')
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

  @Put('alterar-senha')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Change current actor password.' })
  @UseGuards(CognitoJwtGuard)
  changePassword(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Body()
    body: { senhaAtual: string; novaSenha: string },
  ) {
    return this.sessionService.changePassword(actor, body);
  }
}
