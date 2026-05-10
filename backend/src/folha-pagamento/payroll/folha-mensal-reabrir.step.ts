import { Injectable } from '@nestjs/common';

import { SgpEsocialEmittersService } from '../../integrations/stynx-esocial';
import { FolhaMensalResult } from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@Injectable()
export class FolhaMensalReabrirStepService {
  constructor(
    private readonly workflow: FolhaMensalWorkflow,
    private readonly esocialEmitters?: SgpEsocialEmittersService,
  ) {}

  async execute(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    const result = await this.workflow.transaction(async (client) => {
      const context = await this.workflow.loadContext(client, input);
      this.workflow.assertCompetenceStatus(context.competence.status, [
        'CLOSED',
      ]);
      const validation = await this.workflow.validateRun(
        client,
        context.run.id,
      );
      await this.workflow.reopenCompetenceStatus(client, context.competence.id);
      await this.workflow.reopenRunStatus(client, context.run.id);
      await this.workflow.appendHistory(
        client,
        context.run.id,
        'DRAFT',
        'Monthly competence reopened',
        { event: 'monthly.reopened', validation },
      );
      await this.workflow.appendAuditEvent(
        client,
        context.run.id,
        'monthly.reopened',
        { validation },
      );
      return this.workflow.buildResult(
        client,
        context.competence.id,
        context.run.id,
        validation,
      );
    });
    await this.esocialEmitters?.emitForCurrentTenant('s1298Reopen', {
      sourceId: result.payrollRunId,
      operation: 'reopen',
      data: {
        payrollRunId: result.payrollRunId,
        competenceYear: result.competenceYear,
        competenceMonth: result.competenceMonth,
        competenceStatus: result.competenceStatus,
        payrollStatus: result.payrollStatus,
      },
    });
    return result;
  }
}
