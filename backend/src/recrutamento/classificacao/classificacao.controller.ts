import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
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
import { PublishClassificacaoDto } from './classificacao.dto';
import { ClassificacaoService } from './classificacao.service';

@ApiTags('recrutamento-classificacao')
@ApiBearerAuth()
@Controller('v1/admin/concursos')
export class ClassificacaoController {
  constructor(private readonly classificacaoService: ClassificacaoService) {}

  @ApiOperation({ summary: 'POST :id/classificacao' })
  @Post(':id/classificacao')
  @RequirePermission('recrutamento.classificacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.classificacao_snapshot',
    tableName: 'recrutamento.classificacao_snapshot',
  })
  @ApiCreatedResponse({ description: 'Generate a classification snapshot.' })
  gerar(@Param('id') id: string) {
    return this.classificacaoService.gerar(id);
  }

  @ApiOperation({ summary: 'POST :id/classificacao/publicacao' })
  @Post(':id/classificacao/publicacao')
  @RequirePermission('recrutamento.classificacao.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.classificacao_snapshot',
    tableName: 'recrutamento.classificacao_snapshot',
  })
  @ApiOkResponse({ description: 'Publish a classification snapshot.' })
  publicar(@Body() body: PublishClassificacaoDto) {
    return this.classificacaoService.publicar(body.snapshotId);
  }
}

@ApiTags('public-concursos')
@Controller('v1/publico/concursos')
export class PublicClassificacaoController {
  constructor(private readonly classificacaoService: ClassificacaoService) {}

  @ApiOperation({ summary: 'GET :slug/classificacao' })
  @Get(':slug/classificacao')
  @Public()
  @ApiOkResponse({ description: 'Published public contest classification.' })
  publicBySlug(@Param('slug') slug: string) {
    return this.classificacaoService.publicBySlug(slug);
  }
}
