import { Controller, Get, Headers } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../iam/decorators/require-permission.decorator';
import { LgpdDpoService } from './lgpd-dpo.service';

@ApiTags('public-lgpd')
@Controller('v1/public/lgpd')
export class LgpdDpoController {
  constructor(private readonly lgpdDpoService: LgpdDpoService) {}

  @ApiOperation({ summary: 'GET encarregado' })
  @Get('encarregado')
  @Public()
  @ApiOkResponse({ description: 'Public LGPD DPO contact.' })
  encarregado(@Headers('x-tenant-id') tenantId?: string) {
    return this.lgpdDpoService.getPublicContact(tenantId);
  }

  @ApiOperation({ summary: 'GET transferencias-internacionais' })
  @Get('transferencias-internacionais')
  @Public()
  @ApiOkResponse({
    description: 'Public active LGPD international transfer mechanisms.',
  })
  transferenciasInternacionais(@Headers('x-tenant-id') tenantId?: string) {
    return this.lgpdDpoService.listPublicInternationalTransfers(tenantId);
  }
}
