import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../../audit/audit.service';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import {
  CreateTalentPoolCandidateDto,
  TalentPoolListQueryDto,
  UpdateTalentPoolCandidateDto,
} from './banco-talentos.dto';
import { BancoTalentosService } from './banco-talentos.service';

@ApiTags('recrutamento')
@ApiBearerAuth()
@Controller('v1/recrutamento/banco-talentos')
export class BancoTalentosController {
  constructor(
    private readonly bancoTalentosService: BancoTalentosService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'GET banco-talentos' })
  @Get()
  @RequirePermission('recrutamento.read')
  @ApiOkResponse({ description: 'Search talent-pool candidate profiles.' })
  list(@Query() query: TalentPoolListQueryDto) {
    return this.bancoTalentosService.list(query);
  }

  @ApiOperation({ summary: 'GET banco-talentos/:id' })
  @Get(':id')
  @RequirePermission('recrutamento.read')
  @ApiOkResponse({ description: 'Read a talent-pool candidate profile.' })
  findById(@Param('id') id: string) {
    return this.bancoTalentosService.findById(id);
  }

  @ApiOperation({ summary: 'POST banco-talentos' })
  @Post()
  @RequirePermission('recrutamento.write')
  @ApiCreatedResponse({
    description: 'Create a talent-pool candidate profile.',
  })
  async create(
    @Req() request: RequestWithContext,
    @Body() body: CreateTalentPoolCandidateDto,
  ) {
    const created = await this.bancoTalentosService.create(body);
    await this.auditMutation(request, 'CREATE', created.id);
    return created;
  }

  @ApiOperation({ summary: 'PATCH banco-talentos/:id' })
  @Patch(':id')
  @RequirePermission('recrutamento.write')
  @ApiOkResponse({ description: 'Update a talent-pool candidate profile.' })
  async update(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdateTalentPoolCandidateDto,
  ) {
    const updated = await this.bancoTalentosService.update(id, body);
    await this.auditMutation(request, 'UPDATE', updated.id);
    return updated;
  }

  @ApiOperation({ summary: 'DELETE banco-talentos/:id' })
  @Delete(':id')
  @RequirePermission('recrutamento.write')
  @ApiOkResponse({
    description: 'Archive a talent-pool candidate profile.',
  })
  async archive(@Req() request: RequestWithContext, @Param('id') id: string) {
    const archived = await this.bancoTalentosService.archive(id);
    await this.auditMutation(request, 'DELETE', archived.id);
    return archived;
  }

  private auditMutation(
    request: RequestWithContext,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceId: string,
  ) {
    return this.auditService.auditMutation(
      request,
      action,
      'recrutamento.candidato',
      {
        resourceId,
        tableName: 'recrutamento.candidato',
      },
    );
  }
}
