import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';
import { Public } from '../../iam/decorators/require-permission.decorator';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  health() {
    return this.healthService.health();
  }

  @Get('ready')
  @Public()
  readiness() {
    return this.healthService.readiness();
  }
}
