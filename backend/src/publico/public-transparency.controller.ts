import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import { Public } from '../iam/decorators/require-permission.decorator';
import { PublicTransparencyService } from './public-transparency.service';

@ApiTags('publico')
@Controller('publico/v1/:tenant/transparencia')
export class PublicTransparencyController {
  constructor(
    private readonly publicTransparencyService: PublicTransparencyService,
  ) {}

  @Get('folha')
  @Public()
  @ApiOkResponse({ description: 'Public payroll transparency listing.' })
  folha(@Param('tenant') tenant: string, @Query() query: DomainListQueryDto) {
    return this.publicTransparencyService.payrollTransparency(tenant, query);
  }
}
