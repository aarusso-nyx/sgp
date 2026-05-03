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
import type {
  CreateProvaDto,
  CreateQuestaoDto,
  RecordRespostasDto,
} from './avaliacao.dto';
import { ProvaService } from './prova.service';

@ApiTags('recrutamento-avaliacao')
@ApiBearerAuth()
@Controller('v1/recrutamento/avaliacao/provas')
export class ProvaController {
  constructor(private readonly provaService: ProvaService) {}

  @ApiOperation({ summary: 'GET concursos/:concursoId' })
  @Get('concursos/:concursoId')
  @RequirePermission('recrutamento.avaliacao.read')
  @ApiOkResponse({ description: 'List evaluation exams for a contest.' })
  list(@Param('concursoId') concursoId: string) {
    return this.provaService.list(concursoId);
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('recrutamento.avaliacao.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.prova',
    tableName: 'recrutamento.prova',
  })
  @ApiCreatedResponse({ description: 'Create an evaluation exam.' })
  create(@Body() body: CreateProvaDto) {
    return this.provaService.create(body);
  }

  @ApiOperation({ summary: 'POST :provaId/questoes' })
  @Post(':provaId/questoes')
  @RequirePermission('recrutamento.avaliacao.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.questao',
    tableName: 'recrutamento.questao',
  })
  @ApiCreatedResponse({ description: 'Append an exam question.' })
  addQuestao(
    @Param('provaId') provaId: string,
    @Body() body: CreateQuestaoDto,
  ) {
    return this.provaService.addQuestao(provaId, body);
  }

  @ApiOperation({ summary: 'POST :provaId/respostas' })
  @Post(':provaId/respostas')
  @RequirePermission('recrutamento.avaliacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.resposta_candidato',
    tableName: 'recrutamento.resposta_candidato',
  })
  @ApiCreatedResponse({ description: 'Record candidate answer sheets.' })
  recordRespostas(
    @Param('provaId') provaId: string,
    @Body() body: RecordRespostasDto,
  ) {
    return this.provaService.recordRespostas(provaId, body);
  }
}
