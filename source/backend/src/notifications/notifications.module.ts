import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
