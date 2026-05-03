import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';

import { AlimonyDeductionService } from '../operations/alimony/alimony-deduction.service';
import { ConsignmentDeductionService } from '../operations/consignment/consignment-deduction.service';
import { FolhaMensalResult } from './folha-mensal.types';
import { FolhaMensalWorkflow } from './folha-mensal.workflow';
import { FolhaMensalCompetenceDto } from './payroll.dto';

@Injectable()
export class FolhaMensalCalcularStepService {
  constructor(
    private readonly workflow: FolhaMensalWorkflow,
    private readonly alimonyDeductionService?: AlimonyDeductionService,
    private readonly consignmentDeductionService?: ConsignmentDeductionService,
  ) {}

  async execute(input: FolhaMensalCompetenceDto): Promise<FolhaMensalResult> {
    this.workflow.ensureDatabase();
    return this.workflow.transaction(async (client) => {
      const context = await this.workflow.loadContext(client, input);
      this.workflow.assertCompetenceStatus(context.competence.status, ['OPEN']);

      await this.workflow.updateCompetenceStatus(
        client,
        context.competence.id,
        'CALCULATING',
      );
      await this.workflow.updateRunStatus(client, context.run.id, 'PROCESSING');
      await this.workflow.appendHistory(
        client,
        context.run.id,
        'PROCESSING',
        'Monthly payroll calculation started',
        { event: 'monthly.calculating' },
      );

      await this.workflow.softDeleteCalculatedItems(client, context.run.id);
      await this.workflow.deleteFinancialRecords(client, context.run.id);
      await this.workflow.insertMonthlyCalculatedItems(
        client,
        context.run.id,
        context.catalog.payroll_type_id,
        input,
      );
      await this.insertAlimonyDeductions(client, context.run.id, input);
      await this.insertConsignmentDeductions(
        client,
        context.run.id,
        context.catalog.consignment_deduction_id,
        input,
      );
      await this.workflow.refreshFinancialRecords(
        client,
        context.run.id,
        input,
      );
      await this.workflow.refreshRunTotals(client, context.run.id, 'GENERATED');

      const validation = await this.workflow.validateRun(
        client,
        context.run.id,
      );
      await this.workflow.updateCompetenceStatus(
        client,
        context.competence.id,
        'CALCULATED',
      );
      await this.workflow.appendHistory(
        client,
        context.run.id,
        'GENERATED',
        'Monthly payroll calculated',
        { event: 'monthly.calculated', validation },
      );
      await this.workflow.appendAuditEvent(
        client,
        context.run.id,
        'monthly.calculated',
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

  private async insertConsignmentDeductions(
    client: PoolClient,
    payrollRunId: string,
    earningDeductionId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<number> {
    if (!this.consignmentDeductionService) return 0;
    return this.consignmentDeductionService.insertActiveLoanDeductions(client, {
      payrollRunId,
      earningDeductionId,
      competenceYear: input.year,
      competenceMonth: input.month,
    });
  }

  private async insertAlimonyDeductions(
    client: PoolClient,
    payrollRunId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<number> {
    if (!this.alimonyDeductionService) return 0;
    const rows = await client.query<{ id: string }>(
      `
      SELECT id::text
      FROM payroll.payroll_earning_deduction
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND code = 'ALIMONY_DEDUCTION'
        AND active = true
      LIMIT 1
      `,
    );
    const earningDeductionId = rows.rows[0]?.id;
    if (!earningDeductionId) return 0;
    return this.alimonyDeductionService.insertActiveOrderDeductions(client, {
      payrollRunId,
      earningDeductionId,
      competenceYear: input.year,
      competenceMonth: input.month,
    });
  }
}
