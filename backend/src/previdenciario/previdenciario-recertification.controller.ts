import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import {
  CreateBeneficiaryContactHistoryDto,
  CreateExternalLifeProofDto,
  CreateRecertificationBeneficiaryDto,
  CreateRecertificationCampaignDto,
  CreateRecertificationRecordDto,
  GeneratePrevidenciarioOutputDto,
} from './previdenciario.dto';
import {
  PREVIDENCIARIO_SERVICE_REGISTRY,
  type PrevidenciarioServiceRegistry,
} from './previdenciario.tokens';
import { RecadastramentoService } from './recadastramento/recadastramento.service';

@ApiTags('previdenciario')
@ApiBearerAuth()
@Controller('v1/previdenciario')
export class PrevidenciarioRecertificationController {
  private readonly recadastramentoService: RecadastramentoService;

  constructor(
    private readonly auditService: AuditService,
    @Inject(PREVIDENCIARIO_SERVICE_REGISTRY)
    registry: PrevidenciarioServiceRegistry,
  ) {
    this.recadastramentoService = registry.recadastramento;
  }

  @ApiOperation({ summary: 'GET recadastramentos/campanhas' })
  @Get('recadastramentos/campanhas')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List recertification campaigns.' })
  listCampaigns() {
    return this.recadastramentoService.listCampaigns();
  }

  @ApiOperation({ summary: 'POST recadastramentos/campanhas' })
  @Post('recadastramentos/campanhas')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a recertification campaign.' })
  async createCampaign(
    @Req() request: RequestWithContext,
    @Body() body: CreateRecertificationCampaignDto,
  ) {
    const created = await this.recadastramentoService.createCampaign(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'recertification_campaign',
      {
        resourceId: created.id,
        tableName: 'recertification_campaign',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'GET recadastramentos/beneficiarios' })
  @Get('recadastramentos/beneficiarios')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List recertification beneficiaries.' })
  listBeneficiaries() {
    return this.recadastramentoService.listBeneficiaries();
  }

  @ApiOperation({ summary: 'GET recadastramentos/pendencias' })
  @Get('recadastramentos/pendencias')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List pending recertification beneficiaries.' })
  listPendingRecertifications() {
    return this.recadastramentoService.listPendingRecertifications();
  }

  @ApiOperation({ summary: 'GET recadastramentos/historico' })
  @Get('recadastramentos/historico')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List beneficiary contact history.' })
  listBeneficiaryContactHistory() {
    return this.recadastramentoService.listBeneficiaryContactHistory();
  }

  @ApiOperation({ summary: 'POST recadastramentos/beneficiarios' })
  @Post('recadastramentos/beneficiarios')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Register a recertification beneficiary.',
  })
  async createBeneficiary(
    @Req() request: RequestWithContext,
    @Body() body: CreateRecertificationBeneficiaryDto,
  ) {
    const created = await this.recadastramentoService.createBeneficiary(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'recertification_beneficiary',
      {
        resourceId: created.id,
        tableName: 'recertification_beneficiary',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST recadastramentos/atos' })
  @Post('recadastramentos/atos')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Register a recertification act.' })
  async createRecord(
    @Req() request: RequestWithContext,
    @Body() body: CreateRecertificationRecordDto,
  ) {
    const created = await this.recadastramentoService.createRecord(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'recertification_record',
      {
        resourceId: created.id,
        tableName: 'recertification_record',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST recadastramentos/historico' })
  @Post('recadastramentos/historico')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Register beneficiary contact history.' })
  async createBeneficiaryContactHistory(
    @Req() request: RequestWithContext,
    @Body() body: CreateBeneficiaryContactHistoryDto,
  ) {
    const created =
      await this.recadastramentoService.createBeneficiaryContactHistory(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'beneficiary_contact_history',
      {
        resourceId: created.id,
        tableName: 'beneficiary_contact_history',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST provas-vida' })
  @Post('provas-vida')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Register an external life proof.' })
  async createExternalLifeProof(
    @Req() request: RequestWithContext,
    @Body() body: CreateExternalLifeProofDto,
  ) {
    const created =
      await this.recadastramentoService.createExternalLifeProof(body);
    await this.auditService.auditMutation(
      request,
      'PROCESS',
      'external_life_proof',
      {
        resourceId: created.id,
        tableName: 'external_life_proof',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST recadastramentos/convocacoes' })
  @Post('recadastramentos/convocacoes')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Queue recertification notices.' })
  async requestRecertificationNotice(
    @Req() request: RequestWithContext,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created =
      await this.recadastramentoService.requestRecertificationNotice(body);
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'recertification_notice_report',
      {
        tableName: 'report_request',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST recadastramentos/relatorios' })
  @Post('recadastramentos/relatorios')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Queue a recertification pending report.',
  })
  async requestRecertificationPendingReport(
    @Req() request: RequestWithContext,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created =
      await this.recadastramentoService.requestRecertificationPendingReport(
        body,
      );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'recertification_pending_report',
      {
        tableName: 'report_request',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST transferencia-siprev/exportar' })
  @Post('transferencia-siprev/exportar')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Queue a SIPREV export request.' })
  async requestSiprevExport(
    @Req() request: RequestWithContext,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created = await this.recadastramentoService.requestSiprevExport(body);
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'siprev_export_request',
      {
        tableName: 'report_request',
      },
    );
    return created;
  }
}
