import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PoolClient } from 'pg';

import { FgtsService } from '../fgts/fgts.service';
import { PisPasepService } from '../pis-pasep/pis-pasep.service';
import { FolhaMensalResult } from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@Injectable()
export class FolhaMensalFecharStepService {
  constructor(
    private readonly workflow: FolhaMensalWorkflow,
    private readonly fgtsService?: FgtsService,
    private readonly pisPasepService?: PisPasepService,
  ) {}

  async execute(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    const result = await this.workflow.transaction(async (client) => {
      const context = await this.workflow.loadContext(client, input);
      this.workflow.assertCompetenceStatus(context.competence.status, [
        'GENERATED',
      ]);
      const validation = await this.workflow.validateRun(
        client,
        context.run.id,
      );
      const fgts = await this.accrueFgts(client, context.run.id);
      await this.workflow.updateCompetenceStatus(
        client,
        context.competence.id,
        'CLOSED',
      );
      await this.workflow.updateRunStatus(client, context.run.id, 'CLOSED');
      await this.workflow.appendHistory(
        client,
        context.run.id,
        'CLOSED',
        'Monthly competence closed',
        { event: 'monthly.closed', validation, fgts },
      );
      await this.workflow.appendAuditEvent(
        client,
        context.run.id,
        'monthly.closed',
        { validation, fgts },
      );
      return this.workflow.buildResult(
        client,
        context.competence.id,
        context.run.id,
        validation,
      );
    });
    await this.pisPasepService?.handlePayrollRunClosed(result.payrollRunId);
    return result;
  }

  private async accrueFgts(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<{ movementCount: number; totalAmount: string }> {
    if (!this.fgtsService) {
      return { movementCount: 0, totalAmount: '0.00' };
    }
    const movements = await this.fgtsService.accrueMonthly(
      payrollRunId,
      client,
    );
    const total = movements.reduce(
      (sum, movement) => sum.plus(movement.amount),
      new Decimal(0),
    );
    return {
      movementCount: movements.length,
      totalAmount: total.toFixed(2),
    };
  }
}
