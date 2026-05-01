import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { NotificationsService } from './notifications.service';

class NotificationPreferencesDto {
  canais?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  categorias?: {
    sistema?: boolean;
    folha?: boolean;
    rh?: boolean;
    auditoria?: boolean;
  };
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@AuditMutation({ resourceType: 'notification_preferences' })
@Controller('v1/usuarios/me')
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferencias-notificacao')
  @RequirePermissions('auth:read')
  @ApiOkResponse({ description: 'Current user notification preferences.' })
  getPreferences() {
    return this.notificationsService.getUserPreferences();
  }

  @Put('preferencias-notificacao')
  @RequirePermissions('auth:read')
  @ApiOkResponse({
    description: 'Update current user notification preferences.',
  })
  updatePreferences(@Body() body: NotificationPreferencesDto) {
    return this.notificationsService.updateUserPreferences(body);
  }
}
