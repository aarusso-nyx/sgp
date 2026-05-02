import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
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
