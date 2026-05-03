import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';
import { Public } from '../../iam/decorators/require-permission.decorator';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'GET Health' })
  @Get()
  @Public()
  health() {
    return this.healthService.health();
  }

  @ApiOperation({ summary: 'GET ready' })
  @Get('ready')
  @Public()
  readiness() {
    return this.healthService.readiness();
  }
}
