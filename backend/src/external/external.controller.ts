import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { ExternalService } from './external.service';

@ApiTags('external')
@ApiBearerAuth()
@Controller('external/v1')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @ApiOperation({ summary: 'GET dados' })
  @Get('dados')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'External API health/data probe.' })
  dados() {
    return this.externalService.dados();
  }

  @ApiOperation({ summary: 'GET dicionario/entidades' })
  @Get('dicionario/entidades')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'External API entity dictionary.' })
  entidades() {
    return this.externalService.entidades();
  }
}
