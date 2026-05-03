import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  Public,
  RequirePermission,
} from '../../iam/decorators/require-permission.decorator';
import { NotaService } from './nota.service';

@ApiTags('recrutamento-avaliacao')
@ApiBearerAuth()
@Controller('v1/recrutamento/avaliacao/notas')
export class NotaController {
  constructor(private readonly notaService: NotaService) {}

  @ApiOperation({ summary: 'GET inscricoes/:inscricaoId' })
  @Get('inscricoes/:inscricaoId')
  @RequirePermission('recrutamento.avaliacao.read')
  @ApiOkResponse({ description: 'List notes for an application.' })
  byInscricao(@Param('inscricaoId') inscricaoId: string) {
    return this.notaService.listByInscricao(inscricaoId);
  }
}

@ApiTags('public-inscricoes')
@Controller('v1/publico/inscricoes/:id/notas')
export class PublicNotaController {
  constructor(private readonly notaService: NotaService) {}

  @ApiOperation({ summary: 'GET Get' })
  @Get()
  @Public()
  @ApiOkResponse({
    description: 'Return candidate notes by application token.',
  })
  get(@Param('id') id: string, @Query('token') token = '') {
    return this.notaService.listPublicByToken(id, token);
  }
}
