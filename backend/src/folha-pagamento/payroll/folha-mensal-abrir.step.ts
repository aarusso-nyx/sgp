import { Injectable } from '@nestjs/common';

import { FolhaMensalResult } from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@Injectable()
export class FolhaMensalAbrirStepService {
  constructor(private readonly workflow: FolhaMensalWorkflow) {}

  async execute(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    return this.workflow.transaction(async (client) => {
      const catalog = await this.workflow.ensureCatalog(client);
      const competence = await this.workflow.ensureCompetence(
        client,
        input,
        'OPEN',
      );
      const run = await this.workflow.ensureRun(
        client,
        catalog,
        input,
        'DRAFT',
      );
      await this.workflow.appendHistory(
        client,
        run.id,
        'DRAFT',
        'Monthly competence opened',
        {
          event: 'monthly.opened',
          competenceId: competence.id,
        },
      );
      await this.workflow.appendAuditEvent(client, run.id, 'monthly.opened', {
        competenceId: competence.id,
        year: input.year,
        month: input.month,
      });
      return this.workflow.buildResult(client, competence.id, run.id);
    });
  }
}
