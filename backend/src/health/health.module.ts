import { Module } from '@nestjs/common';

import { ConfigHealthService } from '../config/config-health.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';

@Module({
  controllers: [HealthController],
  providers: [ConfigHealthService, HealthService],
})
export class HealthModule {}
