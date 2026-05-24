import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import {
  CreateContributionTimeCertificateDto,
  CreatePensionGrantDto,
  CreatePensionCompensationDto,
  CreatePrevidentiaryDeclarationDto,
  CreateRetirementGrantDto,
  GeneratePrevidenciarioOutputDto,
  UpdatePensionCompensationDto,
} from './previdenciario.dto';
import { AposentadoriaService } from './aposentadoria/aposentadoria.service';
import { CtcService } from './ctc/ctc.service';
import { DeclaracaoService } from './declaracao/declaracao.service';
import { PensaoService } from './pensao/pensao.service';
import {
  PREVIDENCIARIO_SERVICE_REGISTRY,
  type PrevidenciarioServiceRegistry,
} from './previdenciario.tokens';

@ApiTags('previdenciario')
@ApiBearerAuth()
@Controller('v1/previdenciario')
export class PrevidenciarioController {
  private readonly aposentadoriaService: AposentadoriaService;
  private readonly pensaoService: PensaoService;
  private readonly ctcService: CtcService;
  private readonly declaracaoService: DeclaracaoService;

  constructor(
    private readonly auditService: AuditService,
    @Inject(PREVIDENCIARIO_SERVICE_REGISTRY)
    registry: PrevidenciarioServiceRegistry,
  ) {
    this.aposentadoriaService = registry.aposentadoria;
    this.pensaoService = registry.pensao;
    this.ctcService = registry.ctc;
    this.declaracaoService = registry.declaracao;
  }

  @ApiOperation({ summary: 'GET aposentadorias' })
  @Get('aposentadorias')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List retirement concessions.' })
  listRetirementGrants() {
    return this.aposentadoriaService.listRetirementGrants();
  }

  @ApiOperation({ summary: 'POST aposentadorias' })
  @Post('aposentadorias')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Grant a retirement benefit.' })
  async createRetirementGrant(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementGrantDto,
  ) {
    const created = await this.aposentadoriaService.createRetirementGrant(
      body,
      request.actor?.username,
    );
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'retirement_grant',
      {
        resourceId: created.id,
        tableName: 'retirement_grant',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'GET pensoes' })
  @Get('pensoes')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List pension grants.' })
  listPensions() {
    return this.pensaoService.listPensions();
  }

  @ApiOperation({ summary: 'POST pensoes' })
  @Post('pensoes')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a pension grant.' })
  async createPension(
    @Req() request: RequestWithContext,
    @Body() body: CreatePensionGrantDto,
  ) {
    const created = await this.pensaoService.createPension(body);
    await this.auditService.auditMutation(request, 'CREATE', 'pension_grant', {
      resourceId: created.id,
      tableName: 'pension_grant',
    });
    return created;
  }

  @ApiOperation({ summary: 'GET certidoes-tempo' })
  @Get('certidoes-tempo')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List contribution time certificates.' })
  listContributionTimeCertificates() {
    return this.ctcService.listContributionTimeCertificates();
  }

  @ApiOperation({ summary: 'POST certidoes-tempo' })
  @Post('certidoes-tempo')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Create a contribution time certificate.',
  })
  async createContributionTimeCertificate(
    @Req() request: RequestWithContext,
    @Body() body: CreateContributionTimeCertificateDto,
  ) {
    const created =
      await this.ctcService.createContributionTimeCertificate(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'contribution_time_certificate',
      {
        resourceId: created.id,
        tableName: 'contribution_time_certificate',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST certidoes-tempo/:id/emitir' })
  @Post('certidoes-tempo/:id/emitir')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Queue a contribution time certificate output.',
  })
  async requestContributionTimeCertificateOutput(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created =
      await this.ctcService.requestContributionTimeCertificateOutput(id, body);
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'contribution_time_certificate_report',
      {
        resourceId: id,
        tableName: 'report_request',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'GET declaracoes' })
  @Get('declaracoes')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List previdentiary declarations.' })
  listDeclarations() {
    return this.declaracaoService.listDeclarations();
  }

  @ApiOperation({ summary: 'POST declaracoes' })
  @Post('declaracoes')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a previdentiary declaration.' })
  async createDeclaration(
    @Req() request: RequestWithContext,
    @Body() body: CreatePrevidentiaryDeclarationDto,
  ) {
    const created = await this.declaracaoService.createDeclaration(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'previdentiary_declaration',
      {
        resourceId: created.id,
        tableName: 'previdentiary_declaration',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST declaracoes/:id/emitir' })
  @Post('declaracoes/:id/emitir')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Queue a previdentiary declaration output.',
  })
  async requestDeclarationOutput(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created = await this.declaracaoService.requestDeclarationOutput(
      id,
      body,
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'previdentiary_declaration_report',
      {
        resourceId: id,
        tableName: 'report_request',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'GET compensacoes' })
  @Get('compensacoes')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List pension compensations.' })
  listCompensations() {
    return this.pensaoService.listCompensations();
  }

  @ApiOperation({ summary: 'POST compensacoes' })
  @Post('compensacoes')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a pension compensation.' })
  async createCompensation(
    @Req() request: RequestWithContext,
    @Body() body: CreatePensionCompensationDto,
  ) {
    const created = await this.pensaoService.createCompensation(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'pension_compensation',
      {
        resourceId: created.id,
        tableName: 'pension_compensation',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH compensacoes/:id' })
  @Patch('compensacoes/:id')
  @RequirePermission('previdenciario.write')
  @ApiOkResponse({ description: 'Update pension compensation status.' })
  async updateCompensation(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdatePensionCompensationDto,
  ) {
    const updated = await this.pensaoService.updateCompensation(id, body);
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'pension_compensation',
      {
        resourceId: updated.id,
        tableName: 'pension_compensation',
      },
    );
    return updated;
  }
}
