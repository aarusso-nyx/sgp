import { Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '../auth/actor.types';
import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../common/pagination/paged-response';
import {
  ContrachequeService,
  PortalPaystub,
} from './contracheque/contracheque.service';
import { DocumentosService } from './documentos/documentos.service';
import { MeusDadosService } from './meus-dados/meus-dados.service';
import { MinhaEquipeService } from './minha-equipe/minha-equipe.service';

@Injectable()
export class PortalService {
  constructor(
    private readonly meusDadosService: MeusDadosService,
    private readonly documentosService: DocumentosService,
    private readonly contrachequeService: ContrachequeService,
    private readonly minhaEquipeService: MinhaEquipeService,
  ) {}

  currentSession(actor: AuthenticatedActor | undefined) {
    return {
      actor,
      authenticated: Boolean(actor),
    };
  }

  govBrStatus() {
    return {
      provider: 'govbr',
      status: 'available',
      checkedAt: new Date().toISOString(),
    };
  }

  getPersonalData(actor: AuthenticatedActor | undefined) {
    return this.meusDadosService.getPersonalData(actor);
  }

  getAddress(actor: AuthenticatedActor | undefined) {
    return this.meusDadosService.getAddress(actor);
  }

  getContact(actor: AuthenticatedActor | undefined) {
    return this.meusDadosService.getContact(actor);
  }

  getDependents(actor: AuthenticatedActor | undefined) {
    return this.meusDadosService.getDependents(actor);
  }

  getDocuments(actor: AuthenticatedActor | undefined) {
    return this.documentosService.getDocuments(actor);
  }

  listDocumentRequests(actor: AuthenticatedActor | undefined) {
    return this.documentosService.listDocumentRequests(actor);
  }

  createDocumentRequest(
    actor: AuthenticatedActor | undefined,
    input: { documentKind: string; purpose?: string; notes?: string },
  ) {
    return this.documentosService.createDocumentRequest(actor, input);
  }

  getMyJob(actor: AuthenticatedActor | undefined) {
    return this.meusDadosService.getMyJob(actor);
  }

  getMyCareer(actor: AuthenticatedActor | undefined) {
    return this.meusDadosService.getMyCareer(actor);
  }

  vacationPayslips(actor: AuthenticatedActor | undefined) {
    return this.contrachequeService.vacationPayslips(actor);
  }

  terminationTerms(actor: AuthenticatedActor | undefined) {
    return this.contrachequeService.terminationTerms(actor);
  }

  getPaystub(
    actor: AuthenticatedActor | undefined,
    competence: string,
  ): Promise<PortalPaystub> {
    return this.contrachequeService.getPaystub(actor, competence);
  }

  requestProfileChange(
    actor: AuthenticatedActor | undefined,
    section: string,
    payload: Record<string, unknown>,
    previousPayload?: Record<string, unknown>,
  ) {
    return this.meusDadosService.requestProfileChange(
      actor,
      section,
      payload,
      previousPayload,
    );
  }

  approvalQueue(actor: AuthenticatedActor | undefined) {
    return this.minhaEquipeService.approvalQueue(actor);
  }

  transitionApproval(
    actor: AuthenticatedActor | undefined,
    kind: string,
    id: string,
    action: 'approve' | 'cancel',
  ) {
    return this.minhaEquipeService.transitionApproval(actor, kind, id, action);
  }

  payrollSummary(query: DomainListQueryDto): Promise<PagedResponse<unknown>> {
    return this.contrachequeService.payrollSummary(query);
  }
}
