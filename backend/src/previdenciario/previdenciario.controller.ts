import {
  Body,
  Controller,
  Get,
  Optional,
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
  CreateBeneficiaryContactHistoryDto,
  CreateContributionTimeCertificateDto,
  CreateExternalLifeProofDto,
  CreatePensionGrantDto,
  CreatePensionCompensationDto,
  CreatePrevidentiaryDeclarationDto,
  CreateRecertificationBeneficiaryDto,
  CreateRecertificationCampaignDto,
  CreateRecertificationRecordDto,
  CreateRetirementGrantDto,
  CreateRetirementRuleDto,
  CreateRetirementSimulationDto,
  GeneratePrevidenciarioOutputDto,
  SimulateEc103AtividadeRiscoProfessorDto,
  SimulateEc103IdadeProgressivaDto,
  SimulateEc103Pedagio50Dto,
  SimulateEc103Pedagio100Dto,
  SimulateEc103PontosDto,
  UpdatePensionCompensationDto,
  UpdateRetirementRuleDto,
} from './previdenciario.dto';
import { AposentadoriaService } from './aposentadoria/aposentadoria.service';
import { CtcService } from './ctc/ctc.service';
import { DeclaracaoService } from './declaracao/declaracao.service';
import { PensaoService } from './pensao/pensao.service';
import { PrevidenciarioService } from './previdenciario.service';
import { RecadastramentoService } from './recadastramento/recadastramento.service';
import { RegrasService } from './regras/regras.service';

@ApiTags('previdenciario')
@ApiBearerAuth()
@Controller('v1/previdenciario')
export class PrevidenciarioController {
  private readonly regrasService: RegrasService;
  private readonly aposentadoriaService: AposentadoriaService;
  private readonly pensaoService: PensaoService;
  private readonly ctcService: CtcService;
  private readonly declaracaoService: DeclaracaoService;
  private readonly recadastramentoService: RecadastramentoService;

  constructor(
    private readonly previdenciarioService: PrevidenciarioService,
    private readonly auditService: AuditService,
    @Optional() regrasService?: RegrasService,
    @Optional() aposentadoriaService?: AposentadoriaService,
    @Optional() pensaoService?: PensaoService,
    @Optional() ctcService?: CtcService,
    @Optional() declaracaoService?: DeclaracaoService,
    @Optional() recadastramentoService?: RecadastramentoService,
  ) {
    this.regrasService =
      regrasService ?? (this.previdenciarioService as unknown as RegrasService);
    this.aposentadoriaService =
      aposentadoriaService ??
      (this.previdenciarioService as unknown as AposentadoriaService);
    this.pensaoService =
      pensaoService ?? (this.previdenciarioService as unknown as PensaoService);
    this.ctcService =
      ctcService ?? (this.previdenciarioService as unknown as CtcService);
    this.declaracaoService =
      declaracaoService ??
      (this.previdenciarioService as unknown as DeclaracaoService);
    this.recadastramentoService =
      recadastramentoService ??
      (this.previdenciarioService as unknown as RecadastramentoService);
  }

  @ApiOperation({ summary: 'GET regras' })
  @Get('regras')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List retirement rules.' })
  listRules() {
    return this.regrasService.listRules();
  }

  @ApiOperation({ summary: 'POST regras' })
  @Post('regras')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a retirement rule.' })
  async createRule(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementRuleDto,
  ) {
    const created = await this.regrasService.createRule(body);
    await this.auditService.auditMutation(
      request,
      'CREATE',
      'retirement_rule',
      {
        resourceId: created.id,
        tableName: 'retirement_rule',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'PATCH regras/:id' })
  @Patch('regras/:id')
  @RequirePermission('previdenciario.write')
  @ApiOkResponse({ description: 'Update a retirement rule.' })
  async updateRule(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdateRetirementRuleDto,
  ) {
    const updated = await this.regrasService.updateRule(id, body);
    await this.auditService.auditMutation(
      request,
      'UPDATE',
      'retirement_rule',
      {
        resourceId: updated.id,
        tableName: 'retirement_rule',
      },
    );
    return updated;
  }

  @ApiOperation({ summary: 'GET simulacoes' })
  @Get('simulacoes')
  @RequirePermission('previdenciario.read')
  @ApiOkResponse({ description: 'List retirement simulations.' })
  listSimulations() {
    return this.regrasService.listSimulations();
  }

  @ApiOperation({ summary: 'POST simulacoes' })
  @Post('simulacoes')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({ description: 'Create a retirement simulation.' })
  async createSimulation(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementSimulationDto,
  ) {
    const created = await this.regrasService.createSimulation(
      body,
      request.actor?.username,
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: created.id,
        tableName: 'retirement_simulation',
      },
    );
    return created;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/pedagio-100' })
  @Post('simulacoes/ec103/pedagio-100')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 20 Pedagio 100 transition rule.',
  })
  async simulateEc103Pedagio100(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103Pedagio100Dto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulatePedagio100(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/pedagio-50' })
  @Post('simulacoes/ec103/pedagio-50')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 17 Pedagio 50 transition rule.',
  })
  async simulateEc103Pedagio50(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103Pedagio50Dto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulatePedagio50(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/pontos' })
  @Post('simulacoes/ec103/pontos')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 4 points transition rule.',
  })
  async simulateEc103Pontos(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103PontosDto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulatePontos(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/idade-progressiva' })
  @Post('simulacoes/ec103/idade-progressiva')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description: 'Simulate EC 103/2019 art. 16 progressive age rule.',
  })
  async simulateEc103IdadeProgressiva(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103IdadeProgressivaDto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulateIdadeProgressiva(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
  }

  @ApiOperation({ summary: 'POST simulacoes/ec103/atividade-risco-professor' })
  @Post('simulacoes/ec103/atividade-risco-professor')
  @RequirePermission('previdenciario.write')
  @ApiCreatedResponse({
    description:
      'Simulate EC 103/2019 risk-activity or federal teacher transition rules.',
  })
  async simulateEc103AtividadeRiscoProfessor(
    @Req() request: RequestWithContext,
    @Body() body: SimulateEc103AtividadeRiscoProfessorDto,
  ) {
    const result = await Promise.resolve(
      this.regrasService.simulateAtividadeRiscoProfessor(body),
    );
    await this.auditService.auditMutation(
      request,
      'GENERATE',
      'retirement_simulation',
      {
        resourceId: result.rule,
        tableName: 'retirement_simulation',
      },
    );
    return result;
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
