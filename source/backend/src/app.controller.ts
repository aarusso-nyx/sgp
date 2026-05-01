import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';
import { Public } from './iam/decorators/require-permission.decorator';

@ApiTags('root')
@Controller('v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getRootMetadata() {
    return this.appService.getHello();
  }
}
