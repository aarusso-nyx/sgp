import { Injectable } from '@nestjs/common';

import { FolhaMensalResult } from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@Injectable()
export class FolhaMensalGerarStepService {
  constructor(private readonly workflow: FolhaMensalWorkflow) {}

  async execute(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    return this.workflow.transaction(async (client) => {
      const context = await this.workflow.loadContext(client, input);
      this.workflow.assertCompetenceStatus(context.competence.status, [
        'APPROVED',
      ]);
      const validation = await this.workflow.validateRun(
        client,
        context.run.id,
      );
      await this.workflow.updateCompetenceStatus(
        client,
        context.competence.id,
        'GENERATED',
      );
      await this.workflow.updateRunStatus(client, context.run.id, 'GENERATED');
      await this.workflow.appendHistory(
        client,
        context.run.id,
        'GENERATED',
        'Monthly paystubs generated',
        { event: 'monthly.generated', validation },
      );
      await this.workflow.appendAuditEvent(
        client,
        context.run.id,
        'monthly.generated',
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
