import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  health() {
    return this.healthService.health();
  }

  @Get('ready')
  readiness() {
    return this.healthService.readiness();
  }
}
