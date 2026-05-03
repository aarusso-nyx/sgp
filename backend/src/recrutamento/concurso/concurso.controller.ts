import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentActor } from '../../auth/current-actor.decorator';
import type { AuthenticatedActor } from '../../auth/auth.types';
import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import {
  Public,
  RequirePermission,
} from '../../iam/decorators/require-permission.decorator';
import { ConcursoService } from './concurso.service';
import { EditalService } from './edital.service';
import { CreateConcursoDto } from './concurso.dto';

@ApiTags('recrutamento-concurso')
@ApiBearerAuth()
@Controller('v1/recrutamento/concursos')
export class ConcursoController {
  constructor(private readonly concursoService: ConcursoService) {}

  @ApiOperation({ summary: 'GET List' })
  @Get()
  @RequirePermission('recrutamento.concurso.read')
  @ApiOkResponse({ description: 'List public contests.' })
  list() {
    return this.concursoService.list();
  }

  @ApiOperation({ summary: 'POST Create' })
  @Post()
  @RequirePermission('recrutamento.concurso.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.concurso',
    tableName: 'recrutamento.concurso',
  })
  @ApiCreatedResponse({ description: 'Create a public contest.' })
  create(
    @Body() body: CreateConcursoDto,
    @CurrentActor() actor?: AuthenticatedActor,
  ) {
    return this.concursoService.create(body, actor);
  }
}

@ApiTags('public-concursos')
@Controller('v1/publico/concursos')
export class PublicConcursoController {
  constructor(private readonly editalService: EditalService) {}

  @ApiOperation({ summary: 'GET :slug' })
  @Get(':slug')
  @Public()
  @ApiOkResponse({ description: 'Published public contest notice.' })
  publicBySlug(@Param('slug') slug: string) {
    return this.editalService.publicBySlug(slug);
  }
}
