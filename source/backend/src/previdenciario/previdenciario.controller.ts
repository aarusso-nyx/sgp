import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditService } from '../audit/audit.service';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
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
  UpdatePensionCompensationDto,
  UpdateRetirementRuleDto,
} from './previdenciario.dto';
import { PrevidenciarioService } from './previdenciario.service';

@ApiTags('previdenciario')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/previdenciario')
export class PrevidenciarioController {
  constructor(
    private readonly previdenciarioService: PrevidenciarioService,
    private readonly auditService: AuditService,
  ) {}

  @Get('regras')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List retirement rules.' })
  listRules() {
    return this.previdenciarioService.listRules();
  }

  @Post('regras')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Create a retirement rule.' })
  async createRule(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementRuleDto,
  ) {
    const created = await this.previdenciarioService.createRule(body);
    await this.auditService.appendMutation(
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

  @Patch('regras/:id')
  @RequirePermissions('previdenciario:write')
  @ApiOkResponse({ description: 'Update a retirement rule.' })
  async updateRule(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdateRetirementRuleDto,
  ) {
    const updated = await this.previdenciarioService.updateRule(id, body);
    await this.auditService.appendMutation(
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

  @Get('simulacoes')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List retirement simulations.' })
  listSimulations() {
    return this.previdenciarioService.listSimulations();
  }

  @Post('simulacoes')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Create a retirement simulation.' })
  async createSimulation(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementSimulationDto,
  ) {
    const created = await this.previdenciarioService.createSimulation(
      body,
      request.actor?.username,
    );
    await this.auditService.appendMutation(
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

  @Get('aposentadorias')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List retirement concessions.' })
  listRetirementGrants() {
    return this.previdenciarioService.listRetirementGrants();
  }

  @Post('aposentadorias')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Grant a retirement benefit.' })
  async createRetirementGrant(
    @Req() request: RequestWithContext,
    @Body() body: CreateRetirementGrantDto,
  ) {
    const created = await this.previdenciarioService.createRetirementGrant(
      body,
      request.actor?.username,
    );
    await this.auditService.appendMutation(
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

  @Get('pensoes')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List pension grants.' })
  listPensions() {
    return this.previdenciarioService.listPensions();
  }

  @Post('pensoes')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Create a pension grant.' })
  async createPension(
    @Req() request: RequestWithContext,
    @Body() body: CreatePensionGrantDto,
  ) {
    const created = await this.previdenciarioService.createPension(body);
    await this.auditService.appendMutation(request, 'CREATE', 'pension_grant', {
      resourceId: created.id,
      tableName: 'pension_grant',
    });
    return created;
  }

  @Get('certidoes-tempo')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List contribution time certificates.' })
  listContributionTimeCertificates() {
    return this.previdenciarioService.listContributionTimeCertificates();
  }

  @Post('certidoes-tempo')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({
    description: 'Create a contribution time certificate.',
  })
  async createContributionTimeCertificate(
    @Req() request: RequestWithContext,
    @Body() body: CreateContributionTimeCertificateDto,
  ) {
    const created =
      await this.previdenciarioService.createContributionTimeCertificate(body);
    await this.auditService.appendMutation(
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

  @Post('certidoes-tempo/:id/emitir')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({
    description: 'Queue a contribution time certificate output.',
  })
  async requestContributionTimeCertificateOutput(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created =
      await this.previdenciarioService.requestContributionTimeCertificateOutput(
        id,
        body,
      );
    await this.auditService.appendMutation(
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

  @Get('declaracoes')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List previdentiary declarations.' })
  listDeclarations() {
    return this.previdenciarioService.listDeclarations();
  }

  @Post('declaracoes')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Create a previdentiary declaration.' })
  async createDeclaration(
    @Req() request: RequestWithContext,
    @Body() body: CreatePrevidentiaryDeclarationDto,
  ) {
    const created = await this.previdenciarioService.createDeclaration(body);
    await this.auditService.appendMutation(
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

  @Post('declaracoes/:id/emitir')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({
    description: 'Queue a previdentiary declaration output.',
  })
  async requestDeclarationOutput(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created = await this.previdenciarioService.requestDeclarationOutput(
      id,
      body,
    );
    await this.auditService.appendMutation(
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

  @Get('compensacoes')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List pension compensations.' })
  listCompensations() {
    return this.previdenciarioService.listCompensations();
  }

  @Post('compensacoes')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Create a pension compensation.' })
  async createCompensation(
    @Req() request: RequestWithContext,
    @Body() body: CreatePensionCompensationDto,
  ) {
    const created = await this.previdenciarioService.createCompensation(body);
    await this.auditService.appendMutation(
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

  @Patch('compensacoes/:id')
  @RequirePermissions('previdenciario:write')
  @ApiOkResponse({ description: 'Update pension compensation status.' })
  async updateCompensation(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
    @Body() body: UpdatePensionCompensationDto,
  ) {
    const updated = await this.previdenciarioService.updateCompensation(
      id,
      body,
    );
    await this.auditService.appendMutation(
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

  @Get('recadastramentos/campanhas')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List recertification campaigns.' })
  listCampaigns() {
    return this.previdenciarioService.listCampaigns();
  }

  @Post('recadastramentos/campanhas')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Create a recertification campaign.' })
  async createCampaign(
    @Req() request: RequestWithContext,
    @Body() body: CreateRecertificationCampaignDto,
  ) {
    const created = await this.previdenciarioService.createCampaign(body);
    await this.auditService.appendMutation(
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

  @Get('recadastramentos/beneficiarios')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List recertification beneficiaries.' })
  listBeneficiaries() {
    return this.previdenciarioService.listBeneficiaries();
  }

  @Get('recadastramentos/pendencias')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List pending recertification beneficiaries.' })
  listPendingRecertifications() {
    return this.previdenciarioService.listPendingRecertifications();
  }

  @Get('recadastramentos/historico')
  @RequirePermissions('previdenciario:read')
  @ApiOkResponse({ description: 'List beneficiary contact history.' })
  listBeneficiaryContactHistory() {
    return this.previdenciarioService.listBeneficiaryContactHistory();
  }

  @Post('recadastramentos/beneficiarios')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({
    description: 'Register a recertification beneficiary.',
  })
  async createBeneficiary(
    @Req() request: RequestWithContext,
    @Body() body: CreateRecertificationBeneficiaryDto,
  ) {
    const created = await this.previdenciarioService.createBeneficiary(body);
    await this.auditService.appendMutation(
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

  @Post('recadastramentos/atos')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Register a recertification act.' })
  async createRecord(
    @Req() request: RequestWithContext,
    @Body() body: CreateRecertificationRecordDto,
  ) {
    const created = await this.previdenciarioService.createRecord(body);
    await this.auditService.appendMutation(
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

  @Post('recadastramentos/historico')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Register beneficiary contact history.' })
  async createBeneficiaryContactHistory(
    @Req() request: RequestWithContext,
    @Body() body: CreateBeneficiaryContactHistoryDto,
  ) {
    const created =
      await this.previdenciarioService.createBeneficiaryContactHistory(body);
    await this.auditService.appendMutation(
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

  @Post('provas-vida')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Register an external life proof.' })
  async createExternalLifeProof(
    @Req() request: RequestWithContext,
    @Body() body: CreateExternalLifeProofDto,
  ) {
    const created =
      await this.previdenciarioService.createExternalLifeProof(body);
    await this.auditService.appendMutation(
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

  @Post('recadastramentos/convocacoes')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Queue recertification notices.' })
  async requestRecertificationNotice(
    @Req() request: RequestWithContext,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created =
      await this.previdenciarioService.requestRecertificationNotice(body);
    await this.auditService.appendMutation(
      request,
      'GENERATE',
      'recertification_notice_report',
      {
        tableName: 'report_request',
      },
    );
    return created;
  }

  @Post('recadastramentos/relatorios')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({
    description: 'Queue a recertification pending report.',
  })
  async requestRecertificationPendingReport(
    @Req() request: RequestWithContext,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created =
      await this.previdenciarioService.requestRecertificationPendingReport(
        body,
      );
    await this.auditService.appendMutation(
      request,
      'GENERATE',
      'recertification_pending_report',
      {
        tableName: 'report_request',
      },
    );
    return created;
  }

  @Post('transferencia-siprev/exportar')
  @RequirePermissions('previdenciario:write')
  @ApiCreatedResponse({ description: 'Queue a SIPREV export request.' })
  async requestSiprevExport(
    @Req() request: RequestWithContext,
    @Body() body: GeneratePrevidenciarioOutputDto,
  ) {
    const created = await this.previdenciarioService.requestSiprevExport(body);
    await this.auditService.appendMutation(
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
