import { Injectable } from '@nestjs/common';

import { ConfigHealthService } from '../../config/config-health.service';

@Injectable()
export class HealthService {
  constructor(private readonly configHealthService: ConfigHealthService) {}

  health() {
    return {
      ok: true,
      service: process.env.APP_SERVICE_NAME ?? 'sgp-core-api',
      timestamp: new Date().toISOString(),
    };
  }

  readiness() {
    return {
      ok: true,
      service: process.env.APP_SERVICE_NAME ?? 'sgp-core-api',
      checks: {
        config: this.configHealthService.summary(),
      },
    };
  }
}
