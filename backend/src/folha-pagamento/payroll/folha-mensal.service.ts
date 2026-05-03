import { Injectable, Optional } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { FgtsService } from '../fgts/fgts.service';
import { AlimonyDeductionService } from '../operations/alimony/alimony-deduction.service';
import { ConsignmentDeductionService } from '../operations/consignment/consignment-deduction.service';
import { PisPasepService } from '../pis-pasep/pis-pasep.service';
import { FolhaMensalAbrirStepService } from './folha-mensal-abrir.step';
import { FolhaMensalAprovarStepService } from './folha-mensal-aprovar.step';
import { FolhaMensalCalcularStepService } from './folha-mensal-calcular.step';
import { FolhaMensalFecharStepService } from './folha-mensal-fechar.step';
import { FolhaMensalGerarStepService } from './folha-mensal-gerar.step';
import { FolhaMensalReabrirStepService } from './folha-mensal-reabrir.step';
import type {
  FolhaMensalResult,
  FolhaMensalReviewLine,
} from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

export type { FolhaMensalResult, FolhaMensalReviewLine };

@Injectable()
export class FolhaMensalService {
  private readonly abrirStep: FolhaMensalAbrirStepService;
  private readonly calcularStep: FolhaMensalCalcularStepService;
  private readonly aprovarStep: FolhaMensalAprovarStepService;
  private readonly gerarStep: FolhaMensalGerarStepService;
  private readonly fecharStep: FolhaMensalFecharStepService;
  private readonly reabrirStep: FolhaMensalReabrirStepService;
  private readonly workflow: FolhaMensalWorkflow;

  constructor(
    databaseService: DatabaseService,
    @Optional()
    alimonyDeductionService?: AlimonyDeductionService,
    @Optional()
    consignmentDeductionService?: ConsignmentDeductionService,
    @Optional()
    fgtsService?: FgtsService,
    @Optional()
    pisPasepService?: PisPasepService,
  ) {
    this.workflow = new FolhaMensalWorkflow(databaseService);
    this.abrirStep = new FolhaMensalAbrirStepService(this.workflow);
    this.calcularStep = new FolhaMensalCalcularStepService(
      this.workflow,
      alimonyDeductionService,
      consignmentDeductionService,
    );
    this.aprovarStep = new FolhaMensalAprovarStepService(this.workflow);
    this.gerarStep = new FolhaMensalGerarStepService(this.workflow);
    this.fecharStep = new FolhaMensalFecharStepService(
      this.workflow,
      fgtsService,
      pisPasepService,
    );
    this.reabrirStep = new FolhaMensalReabrirStepService(this.workflow);
  }

  openCompetence(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    return this.abrirStep.execute(input);
  }

  calculate(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    return this.calcularStep.execute(input);
  }

  approve(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    return this.aprovarStep.execute(input);
  }

  generate(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    return this.gerarStep.execute(input);
  }

  close(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    return this.fecharStep.execute(input);
  }

  reopen(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    return this.reabrirStep.execute(input);
  }

  review(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    return this.workflow.transaction(async (client) => {
      const context = await this.workflow.loadContext(client, input);
      return this.workflow.buildResult(
        client,
        context.competence.id,
        context.run.id,
      );
    });
  }
}
