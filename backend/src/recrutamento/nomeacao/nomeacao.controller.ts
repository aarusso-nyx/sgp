import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateConvocacaoDto, CreateNomeacaoDto } from './nomeacao.dto';
import { NomeacaoService } from './nomeacao.service';

@ApiTags('recrutamento-nomeacao')
@ApiBearerAuth()
@Controller('v1/admin/nomeacoes')
export class NomeacaoController {
  constructor(private readonly nomeacaoService: NomeacaoService) {}

  @ApiOperation({ summary: 'POST Nomear' })
  @Post()
  @RequirePermission('recrutamento.nomeacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.nomeacao',
    tableName: 'recrutamento.nomeacao',
  })
  @ApiCreatedResponse({
    description: 'Create appointments from the next call order.',
  })
  nomear(@Body() body: CreateNomeacaoDto) {
    return this.nomeacaoService.nomear(body);
  }

  @ApiOperation({ summary: 'POST :id/convocacoes' })
  @Post(':id/convocacoes')
  @RequirePermission('recrutamento.nomeacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.convocacao',
    tableName: 'recrutamento.convocacao',
  })
  @ApiCreatedResponse({
    description: 'Register an official appointment notice.',
  })
  convocar(@Param('id') id: string, @Body() body: CreateConvocacaoDto) {
    return this.nomeacaoService.convocar(id, body);
  }

  @ApiOperation({ summary: 'PATCH :id/desistencia' })
  @Patch(':id/desistencia')
  @RequirePermission('recrutamento.nomeacao.write')
  @AuditMutation({
    action: 'UPDATE',
    resourceType: 'recrutamento.nomeacao',
    tableName: 'recrutamento.nomeacao',
  })
  @ApiOkResponse({ description: 'Mark an appointment as withdrawn.' })
  marcarDesistencia(@Param('id') id: string) {
    return this.nomeacaoService.marcarDesistencia(id);
  }

  @ApiOperation({ summary: 'PATCH :id/expirar-prazo' })
  @Patch(':id/expirar-prazo')
  @RequirePermission('recrutamento.nomeacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.nomeacao',
    tableName: 'recrutamento.nomeacao',
  })
  @ApiOkResponse({ description: 'Expire the appointment attendance deadline.' })
  expirarPrazo(@Param('id') id: string) {
    return this.nomeacaoService.expirarPrazo(id);
  }
}
