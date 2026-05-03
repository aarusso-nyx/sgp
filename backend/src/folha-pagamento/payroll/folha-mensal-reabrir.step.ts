import { Injectable } from '@nestjs/common';

import { FolhaMensalResult } from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@Injectable()
export class FolhaMensalReabrirStepService {
  constructor(private readonly workflow: FolhaMensalWorkflow) {}

  async execute(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    return this.workflow.transaction(async (client) => {
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
  }
}
