import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import {
  Public,
  RequirePermission,
} from '../../iam/decorators/require-permission.decorator';
import type { CreateRecursoDto, DecideRecursoDto } from './avaliacao.dto';
import { RecursoService } from './recurso.service';

@ApiTags('recrutamento-avaliacao')
@ApiBearerAuth()
@Controller('v1/recrutamento/avaliacao/recursos')
export class RecursoController {
  constructor(private readonly recursoService: RecursoService) {}

  @Get('provas/:provaId')
  @RequirePermission('recrutamento.avaliacao.read')
  @ApiOkResponse({ description: 'List candidate resources for an exam.' })
  list(@Param('provaId') provaId: string) {
    return this.recursoService.listOpen(provaId);
  }

  @Post(':id/decisao')
  @RequirePermission('recrutamento.avaliacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.recurso',
    tableName: 'recrutamento.recurso',
  })
  @ApiOkResponse({ description: 'Decide a candidate resource.' })
  decide(@Param('id') id: string, @Body() body: DecideRecursoDto) {
    return this.recursoService.decide(id, body);
  }
}

@ApiTags('public-inscricoes')
@Controller('v1/publico/inscricoes/:id/recursos')
export class PublicRecursoController {
  constructor(private readonly recursoService: RecursoService) {}

  @Post()
  @Public()
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.recurso',
    tableName: 'recrutamento.recurso',
  })
  @ApiCreatedResponse({ description: 'Open a candidate resource by token.' })
  create(
    @Param('id') id: string,
    @Query('token') token = '',
    @Body() body: CreateRecursoDto,
  ) {
    return this.recursoService.createPublic(id, token, body);
  }
}
