import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import {
  InviteAcceptanceController,
  InvitesController,
} from './invites.controller';
import { InvitesService } from './invites.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [UsersController, InvitesController, InviteAcceptanceController],
  providers: [UsersService, InvitesService],
})
export class UsersModule {}
