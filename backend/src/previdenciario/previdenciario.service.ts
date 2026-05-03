import { Injectable, Optional } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { S2400Builder } from '../esocial-worker/builders/s2400.builder';
import { S2405Builder } from '../esocial-worker/builders/s2405.builder';
import { S2410Builder } from '../esocial-worker/builders/s2410.builder';
import { S2416Builder } from '../esocial-worker/builders/s2416.builder';
import { S2418Builder } from '../esocial-worker/builders/s2418.builder';
import { S2420Builder } from '../esocial-worker/builders/s2420.builder';
import { ESocialEmitService } from '../esocial-worker/esocial-emit.service';
import { AposentadoriaService } from './aposentadoria/aposentadoria.service';
import { CtcService } from './ctc/ctc.service';
import { DeclaracaoService } from './declaracao/declaracao.service';
import {
  CreateBeneficiaryContactHistoryDto,
  CreateContributionTimeCertificateDto,
  CreateExternalLifeProofDto,
  CreatePensionCompensationDto,
  CreatePensionGrantDto,
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
import { S2418ReactivationEmissionInput } from './previdenciario.types';
import { PensaoService } from './pensao/pensao.service';
import { RecadastramentoService } from './recadastramento/recadastramento.service';
import { RegrasService } from './regras/regras.service';
import { AtividadeRiscoProfessorService } from './transition-rules/atividade-risco-professor.service';
import { IdadeProgressivaService } from './transition-rules/idade-progressiva.service';
import { Pedagio100Service } from './transition-rules/pedagio100.service';
import { Pedagio50Service } from './transition-rules/pedagio50.service';
import { PontosService } from './transition-rules/pontos.service';

@Injectable()
export class PrevidenciarioService {
  private readonly regras: RegrasService;
  private readonly aposentadoria: AposentadoriaService;
  private readonly pensao: PensaoService;
  private readonly ctc: CtcService;
  private readonly declaracao: DeclaracaoService;
  private readonly recadastramento: RecadastramentoService;

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() regrasService?: RegrasService,
    @Optional() aposentadoriaService?: AposentadoriaService,
    @Optional() pensaoService?: PensaoService,
    @Optional() ctcService?: CtcService,
    @Optional() declaracaoService?: DeclaracaoService,
    @Optional() recadastramentoService?: RecadastramentoService,
    @Optional() pedagio100Service?: Pedagio100Service,
    @Optional() pedagio50Service?: Pedagio50Service,
    @Optional() pontosService?: PontosService,
    @Optional() idadeProgressivaService?: IdadeProgressivaService,
    @Optional() atividadeRiscoProfessorService?: AtividadeRiscoProfessorService,
    @Optional() s2400Builder?: S2400Builder,
    @Optional() s2405Builder?: S2405Builder,
    @Optional() s2410Builder?: S2410Builder,
    @Optional() s2416Builder?: S2416Builder,
    @Optional() s2418Builder?: S2418Builder,
    @Optional() s2420Builder?: S2420Builder,
    @Optional() esocialEmitService?: ESocialEmitService,
  ) {
    this.regras =
      regrasService ??
      new RegrasService(
        this.databaseService,
        undefined,
        pedagio100Service,
        pedagio50Service,
        pontosService,
        idadeProgressivaService,
        atividadeRiscoProfessorService,
      );
    this.aposentadoria =
      aposentadoriaService ??
      new AposentadoriaService(
        this.databaseService,
        this.regras,
        s2400Builder,
        s2410Builder,
        s2418Builder,
        esocialEmitService,
      );
    this.pensao =
      pensaoService ??
      new PensaoService(
        this.databaseService,
        s2410Builder,
        s2416Builder,
        s2420Builder,
        esocialEmitService,
      );
    this.ctc = ctcService ?? new CtcService(this.databaseService);
    this.declaracao =
      declaracaoService ?? new DeclaracaoService(this.databaseService);
    this.recadastramento =
      recadastramentoService ??
      new RecadastramentoService(
        this.databaseService,
        s2405Builder,
        esocialEmitService,
      );
  }

  listRules() {
    return this.regras.listRules();
  }

  createRule(input: CreateRetirementRuleDto) {
    return this.regras.createRule(input);
  }

  updateRule(id: string, input: UpdateRetirementRuleDto) {
    return this.regras.updateRule(id, input);
  }

  listSimulations() {
    return this.regras.listSimulations();
  }

  createSimulation(
    input: CreateRetirementSimulationDto,
    actorUsername?: string,
  ) {
    return this.regras.createSimulation(input, actorUsername);
  }

  simulatePedagio100(input: SimulateEc103Pedagio100Dto) {
    return this.regras.simulatePedagio100(input);
  }

  simulatePedagio50(input: SimulateEc103Pedagio50Dto) {
    return this.regras.simulatePedagio50(input);
  }

  simulatePontos(input: SimulateEc103PontosDto) {
    return this.regras.simulatePontos(input);
  }

  simulateIdadeProgressiva(input: SimulateEc103IdadeProgressivaDto) {
    return this.regras.simulateIdadeProgressiva(input);
  }

  simulateAtividadeRiscoProfessor(
    input: SimulateEc103AtividadeRiscoProfessorDto,
  ) {
    return this.regras.simulateAtividadeRiscoProfessor(input);
  }

  listRetirementGrants() {
    return this.aposentadoria.listRetirementGrants();
  }

  createRetirementGrant(
    input: CreateRetirementGrantDto,
    actorUsername?: string,
  ) {
    return this.aposentadoria.createRetirementGrant(input, actorUsername);
  }

  emitS2418ForBenefitReactivation(input: S2418ReactivationEmissionInput) {
    return this.aposentadoria.emitS2418ForBenefitReactivation(input);
  }

  listPensions() {
    return this.pensao.listPensions();
  }

  createPension(input: CreatePensionGrantDto) {
    return this.pensao.createPension(input);
  }

  listCompensations() {
    return this.pensao.listCompensations();
  }

  createCompensation(input: CreatePensionCompensationDto) {
    return this.pensao.createCompensation(input);
  }

  updateCompensation(id: string, input: UpdatePensionCompensationDto) {
    return this.pensao.updateCompensation(id, input);
  }

  listContributionTimeCertificates() {
    return this.ctc.listContributionTimeCertificates();
  }

  createContributionTimeCertificate(
    input: CreateContributionTimeCertificateDto,
  ) {
    return this.ctc.createContributionTimeCertificate(input);
  }

  requestContributionTimeCertificateOutput(
    certificateId: string,
    input: GeneratePrevidenciarioOutputDto,
  ) {
    return this.ctc.requestContributionTimeCertificateOutput(
      certificateId,
      input,
    );
  }

  listDeclarations() {
    return this.declaracao.listDeclarations();
  }

  createDeclaration(input: CreatePrevidentiaryDeclarationDto) {
    return this.declaracao.createDeclaration(input);
  }

  requestDeclarationOutput(
    declarationId: string,
    input: GeneratePrevidenciarioOutputDto,
  ) {
    return this.declaracao.requestDeclarationOutput(declarationId, input);
  }

  listCampaigns() {
    return this.recadastramento.listCampaigns();
  }

  createCampaign(input: CreateRecertificationCampaignDto) {
    return this.recadastramento.createCampaign(input);
  }

  listBeneficiaries() {
    return this.recadastramento.listBeneficiaries();
  }

  listPendingRecertifications() {
    return this.recadastramento.listPendingRecertifications();
  }

  createBeneficiary(input: CreateRecertificationBeneficiaryDto) {
    return this.recadastramento.createBeneficiary(input);
  }

  createRecord(input: CreateRecertificationRecordDto) {
    return this.recadastramento.createRecord(input);
  }

  createExternalLifeProof(input: CreateExternalLifeProofDto) {
    return this.recadastramento.createExternalLifeProof(input);
  }

  listBeneficiaryContactHistory() {
    return this.recadastramento.listBeneficiaryContactHistory();
  }

  createBeneficiaryContactHistory(input: CreateBeneficiaryContactHistoryDto) {
    return this.recadastramento.createBeneficiaryContactHistory(input);
  }

  requestRecertificationNotice(input: GeneratePrevidenciarioOutputDto) {
    return this.recadastramento.requestRecertificationNotice(input);
  }

  requestRecertificationPendingReport(input: GeneratePrevidenciarioOutputDto) {
    return this.recadastramento.requestRecertificationPendingReport(input);
  }

  requestSiprevExport(input: GeneratePrevidenciarioOutputDto) {
    return this.recadastramento.requestSiprevExport(input);
  }
}

export type { S2418ReactivationEmissionInput };
