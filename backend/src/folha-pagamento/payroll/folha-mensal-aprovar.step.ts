import { Injectable } from '@nestjs/common';

import { FolhaMensalResult } from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@Injectable()
export class FolhaMensalAprovarStepService {
  constructor(private readonly workflow: FolhaMensalWorkflow) {}

  async execute(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    return this.workflow.transaction(async (client) => {
      const context = await this.workflow.loadContext(client, input);
      this.workflow.assertCompetenceStatus(context.competence.status, [
        'CALCULATED',
      ]);
      const validation = await this.workflow.validateRun(
        client,
        context.run.id,
      );
      await this.workflow.updateCompetenceStatus(
        client,
        context.competence.id,
        'APPROVED',
      );
      await this.workflow.updateRunStatus(client, context.run.id, 'APPROVED');
      await this.workflow.appendHistory(
        client,
        context.run.id,
        'APPROVED',
        'Monthly payroll approved',
        { event: 'monthly.approved', validation },
      );
      await this.workflow.appendAuditEvent(
        client,
        context.run.id,
        'monthly.approved',
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
