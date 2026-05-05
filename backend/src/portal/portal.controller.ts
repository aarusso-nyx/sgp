import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentActor } from '../auth/current-actor.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { CadastralChangeRequestDto } from '../rh/employees/employees.dto';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuthenticatedActor } from '../auth/actor.types';
import { PortalService } from './portal.service';

@ApiTags('portal')
@ApiBearerAuth()
@Controller()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @ApiOperation({ summary: 'GET portal/v1/auth/me' })
  @Get('portal/v1/auth/me')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Authenticated portal actor session alias.' })
  authMe(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.currentSession(actor);
  }

  @ApiOperation({ summary: 'GET portal/v1/auth/govbr/status' })
  @Get('portal/v1/auth/govbr/status')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Gov.br identity provider status.' })
  govBrStatus() {
    return this.portalService.govBrStatus();
  }

  @ApiOperation({ summary: 'GET v1/portal/meus-dados/cadastro' })
  @Get('v1/portal/meus-dados/cadastro')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee personal profile.' })
  cadastro(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getPersonalData(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/meus-dados/endereco' })
  @Get('v1/portal/meus-dados/endereco')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee address.' })
  endereco(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getAddress(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/meus-dados/contato' })
  @Get('v1/portal/meus-dados/contato')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee contact data.' })
  contato(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getContact(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/meus-dados/dependentes' })
  @Get('v1/portal/meus-dados/dependentes')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee dependents.' })
  dependentes(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getDependents(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/meus-dados/documentos' })
  @Get('v1/portal/meus-dados/documentos')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee documents.' })
  documentos(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getDocuments(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/meus-dados/cargo' })
  @Get('v1/portal/meus-dados/cargo')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({
    description: 'Authenticated employee current job and salary level.',
  })
  cargo(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getMyJob(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/minha-carreira' })
  @Get('v1/portal/minha-carreira')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({
    description: 'Authenticated employee PCCS career progression trail.',
  })
  minhaCarreira(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getMyCareer(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/contracheques/ferias' })
  @Get('v1/portal/contracheques/ferias')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({
    description: 'Authenticated employee vacation payroll payslips.',
  })
  feriasContracheques(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.vacationPayslips(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/termos-rescisao' })
  @Get('v1/portal/termos-rescisao')
  @RequirePermission('portal.paystub.read')
  @ApiOkResponse({
    description: 'Authenticated employee generated termination terms.',
  })
  termosRescisao(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.terminationTerms(actor);
  }

  @ApiOperation({ summary: 'GET v1/portal/contracheque/:competence' })
  @Get('v1/portal/contracheque/:competence')
  @RequirePermission('portal.paystub.read')
  @ApiOkResponse({
    description: 'Authenticated employee monthly paystub by competence.',
  })
  contracheque(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Param('competence') competence: string,
  ) {
    return this.portalService.getPaystub(actor, competence);
  }

  @ApiOperation({ summary: 'PUT v1/portal/meus-dados/:section' })
  @Put('v1/portal/meus-dados/:section')
  @RequirePermission('portal.profile.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'hr.cadastral_change_request',
    tableName: 'hr.cadastral_change_request',
  })
  @ApiCreatedResponse({ description: 'Create a cadastral change request.' })
  requestChange(
    @CurrentActor() actor: AuthenticatedActor | undefined,
    @Body() body: CadastralChangeRequestDto,
  ) {
    return this.portalService.requestProfileChange(
      actor,
      body.section,
      body.payload,
      body.previousPayload,
    );
  }
}
