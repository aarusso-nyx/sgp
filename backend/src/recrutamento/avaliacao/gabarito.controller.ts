import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { CreateGabaritoDto } from './avaliacao.dto';
import { GabaritoService } from './gabarito.service';

@ApiTags('recrutamento-avaliacao')
@ApiBearerAuth()
@Controller('v1/recrutamento/avaliacao/provas/:provaId/gabaritos')
export class GabaritoController {
  constructor(private readonly gabaritoService: GabaritoService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('recrutamento.avaliacao.read')
  @ApiOkResponse({ description: 'List answer key versions.' })
  list(@Param('provaId') provaId: string) {
    return this.gabaritoService.list(provaId);
  }

  @ApiOperation({ summary: 'POST Publish' })
  @Post()
  @RequirePermission('recrutamento.avaliacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.gabarito',
    tableName: 'recrutamento.gabarito',
  })
  @ApiCreatedResponse({
    description: 'Publish a preliminary or final answer key version.',
  })
  publish(@Param('provaId') provaId: string, @Body() body: CreateGabaritoDto) {
    return this.gabaritoService.publish(provaId, body);
  }
}
