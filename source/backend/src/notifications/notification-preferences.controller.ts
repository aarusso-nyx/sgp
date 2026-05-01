import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
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
@AuditMutation({ resourceType: 'notification_preferences' })
@Controller('v1/usuarios/me')
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferencias-notificacao')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Current user notification preferences.' })
  getPreferences() {
    return this.notificationsService.getUserPreferences();
  }

  @Put('preferencias-notificacao')
  @RequirePermission('auth.read')
  @ApiOkResponse({
    description: 'Update current user notification preferences.',
  })
  updatePreferences(@Body() body: NotificationPreferencesDto) {
    return this.notificationsService.updateUserPreferences(body);
  }
}
