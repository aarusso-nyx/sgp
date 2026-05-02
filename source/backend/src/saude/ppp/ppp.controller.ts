import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { GeneratePppDto } from './ppp.dto';
import { PppService } from './ppp.service';

@ApiTags('saude-ppp')
@ApiBearerAuth()
@Controller('v1/saude/ppp')
export class PppController {
  constructor(private readonly service: PppService) {}

  @Get()
  @RequirePermission('saude.exposure.read')
  @ApiOkResponse({ description: 'Immutable PPP records.' })
  list() {
    return this.service.list();
  }

  @Post('gerar')
  @RequirePermission('saude.exposure.write')
  @AuditMutation({
    action: 'GENERATE',
    resourceType: 'saude.ppp_record',
    tableName: 'saude.ppp_record',
  })
  @ApiCreatedResponse({ description: 'Generate an immutable PPP snapshot.' })
  generate(@Body() body: GeneratePppDto) {
    return this.service.generate(body);
  }
}
