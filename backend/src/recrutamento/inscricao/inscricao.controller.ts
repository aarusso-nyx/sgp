import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { Public } from '../../iam/decorators/require-permission.decorator';
import { CreateInscricaoDto } from './inscricao.dto';
import { InscricaoService } from './inscricao.service';

@ApiTags('public-inscricoes')
@Controller()
export class InscricaoController {
  constructor(private readonly inscricaoService: InscricaoService) {}

  @ApiOperation({ summary: 'POST v1/publico/concursos/:slug/inscricoes' })
  @Post('v1/publico/concursos/:slug/inscricoes')
  @Public()
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.inscricao',
    tableName: 'recrutamento.inscricao',
  })
  @ApiCreatedResponse({ description: 'Create a public contest application.' })
  create(@Param('slug') slug: string, @Body() body: CreateInscricaoDto) {
    return this.inscricaoService.create(slug, body);
  }

  @ApiOperation({ summary: 'GET v1/publico/inscricoes/:id' })
  @Get('v1/publico/inscricoes/:id')
  @Public()
  @ApiOkResponse({
    description: 'Return a public application by access token.',
  })
  get(@Param('id') id: string, @Query('token') token = '') {
    return this.inscricaoService.getPublic(id, token);
  }
}
