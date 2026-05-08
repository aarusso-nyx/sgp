import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  Public,
  RequirePermission,
} from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { InvitesService } from './invites.service';

@ApiTags('users')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'user_invite', tableName: 'user_account' })
@Controller('v1')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @ApiOperation({ summary: 'POST admin/usuarios/convite' })
  @Post('admin/usuarios/convite')
  @RequirePermission('gestao.write')
  @ApiCreatedResponse({ description: 'Create user invitation.' })
  createInvite(
    @Body()
    body: {
      email?: string | undefined;
      login?: string | undefined;
      perfis?: string[] | undefined;
      expiresAt?: string | undefined;
    },
  ) {
    return this.invitesService.createInvite(body);
  }

  @ApiOperation({ summary: 'DELETE admin/convites/:id' })
  @Delete('admin/convites/:id')
  @RequirePermission('gestao.write')
  @ApiOkResponse({ description: 'Cancel invitation.' })
  cancelInvite(@Param('id') id: string) {
    return this.invitesService.cancelInvite(id);
  }
}

@ApiTags('users')
@Controller('v1/convites')
export class InviteAcceptanceController {
  constructor(private readonly invitesService: InvitesService) {}

  @ApiOperation({ summary: 'POST :token/aceitar' })
  @Post(':token/aceitar')
  @Public()
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
