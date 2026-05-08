import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import { NotificationsService } from './notifications.service';

class NotificationReadDto {
  lida?: boolean | undefined;
}

@ApiTags('notifications')
@ApiBearerAuth()
@AuditMutation({ resourceType: 'notification', tableName: 'notification' })
@Controller('v1/notificacoes')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Paged user notifications.' })
  list(@Query() query: DomainListQueryDto) {
    return this.notificationsService.list(query);
  }

  @ApiOperation({ summary: 'GET stream' })
  @Get('stream')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Notifications SSE stream.' })
  stream() {
    return {
      channel: 'notificacoes',
      mode: 'sse',
      status: 'connected',
      connectedAt: new Date().toISOString(),
    };
  }

  @ApiOperation({ summary: 'GET unread-count' })
  @Get('unread-count')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Unread notification count.' })
  unreadCount() {
    return this.notificationsService.unreadCount();
  }

  @ApiOperation({ summary: 'PATCH marcar-todas-lidas' })
  @Patch('marcar-todas-lidas')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Mark all unread notifications as read.' })
  markAllRead() {
    return this.notificationsService.markAllRead();
  }

  @ApiOperation({ summary: 'PATCH :id' })
  @Patch(':id')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Mark a notification read/unread.' })
  markRead(@Param('id') id: string, @Body() body: NotificationReadDto) {
    return this.notificationsService.markRead(id, body.lida ?? true);
  }
}
