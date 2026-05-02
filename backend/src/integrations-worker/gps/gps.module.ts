import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { GpsController } from './gps.controller';
import { GpsService } from './gps.service';
import { GpsTxtSerializer } from './gps-txt.serializer';

@Module({
  imports: [AuditModule, DatabaseModule],
  controllers: [GpsController],
  providers: [GpsService, GpsTxtSerializer],
  exports: [GpsService, GpsTxtSerializer],
})
export class GpsModule {}
