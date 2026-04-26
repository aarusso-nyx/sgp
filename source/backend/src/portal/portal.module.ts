import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
