import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateEditalDto, PublishEditalDto } from './concurso.dto';
import { EditalService } from './edital.service';

@ApiTags('recrutamento-concurso')
@ApiBearerAuth()
@Controller('v1/recrutamento/concursos/:concursoId/editais')
export class EditalController {
  constructor(private readonly editalService: EditalService) {}

  @ApiOperation({ summary: 'POST Create version' })
  @Post()
  @RequirePermission('recrutamento.concurso.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.edital',
    tableName: 'recrutamento.edital',
  })
  @ApiCreatedResponse({ description: 'Create a new edital version.' })
  createVersion(
    @Param('concursoId') concursoId: string,
    @Body() body: CreateEditalDto,
  ) {
    return this.editalService.createVersion(concursoId, body);
  }

  @ApiOperation({ summary: 'POST publish' })
  @Post('publish')
  @RequirePermission('recrutamento.concurso.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.edital',
    tableName: 'recrutamento.edital',
  })
  @ApiOkResponse({ description: 'Publish the latest edital version.' })
  publish(
    @Param('concursoId') concursoId: string,
    @Body() body: PublishEditalDto,
  ) {
    return this.editalService.publish(concursoId, body);
  }
}
