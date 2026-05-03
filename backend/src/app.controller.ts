import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';
import { Public } from './iam/decorators/require-permission.decorator';

@ApiTags('root')
@Controller('v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'GET Get root metadata' })
  @Get()
  @Public()
  getRootMetadata() {
    return this.appService.getHello();
  }
}
