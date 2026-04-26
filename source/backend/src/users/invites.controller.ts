import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { InvitesService } from './invites.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('admin/usuarios/convite')
  @RequirePermissions('gestao:write')
  @ApiCreatedResponse({ description: 'Create user invitation.' })
  createInvite(
    @Body()
    body: {
      email?: string;
      login?: string;
      perfis?: string[];
      expiresAt?: string;
    },
  ) {
    return this.invitesService.createInvite(body);
  }

  @Delete('admin/convites/:id')
  @RequirePermissions('gestao:write')
  @ApiOkResponse({ description: 'Cancel invitation.' })
  cancelInvite(@Param('id') id: string) {
    return this.invitesService.cancelInvite(id);
  }
}

@ApiTags('users')
@Controller('v1/convites')
export class InviteAcceptanceController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post(':token/aceitar')
  @ApiCreatedResponse({
    description: 'Accept invitation and create credentials.',
  })
  acceptInvite(
    @Param('token') token: string,
    @Body() body: { senha?: string; nome?: string },
  ) {
    return this.invitesService.acceptInvite(token, body);
  }
}
