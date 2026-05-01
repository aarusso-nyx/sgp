import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentActor } from '../auth/current-actor.decorator';
import { AuditMutation } from '../common/audit/audit-mutation.decorator';
import { CadastralChangeRequestDto } from '../rh/employees/employees.dto';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { AuthenticatedActor } from '../auth/auth.types';
import { PortalService } from './portal.service';

@ApiTags('portal')
@ApiBearerAuth()
@Controller()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('portal/v1/auth/me')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Authenticated portal actor session alias.' })
  authMe(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.currentSession(actor);
  }

  @Get('portal/v1/auth/govbr/status')
  @RequirePermission('auth.read')
  @ApiOkResponse({ description: 'Gov.br identity provider status.' })
  govBrStatus() {
    return this.portalService.govBrStatus();
  }

  @Get('v1/portal/meus-dados/cadastro')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee personal profile.' })
  cadastro(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getPersonalData(actor);
  }

  @Get('v1/portal/meus-dados/endereco')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee address.' })
  endereco(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getAddress(actor);
  }

  @Get('v1/portal/meus-dados/contato')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee contact data.' })
  contato(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getContact(actor);
  }

  @Get('v1/portal/meus-dados/dependentes')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee dependents.' })
  dependentes(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getDependents(actor);
  }

  @Get('v1/portal/meus-dados/documentos')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({ description: 'Authenticated employee documents.' })
  documentos(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getDocuments(actor);
  }

  @Get('v1/portal/meus-dados/cargo')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({
    description: 'Authenticated employee current job and salary level.',
  })
  cargo(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getMyJob(actor);
  }

  @Get('v1/portal/minha-carreira')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({
    description: 'Authenticated employee PCCS career progression trail.',
  })
  minhaCarreira(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.getMyCareer(actor);
  }

  @Get('v1/portal/contracheques/ferias')
  @RequirePermission('portal.profile.read')
  @ApiOkResponse({
    description: 'Authenticated employee vacation payroll payslips.',
  })
  feriasContracheques(@CurrentActor() actor: AuthenticatedActor | undefined) {
    return this.portalService.vacationPayslips(actor);
  }

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
