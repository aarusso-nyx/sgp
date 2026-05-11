import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { FgtsService } from '../fgts/fgts.service';
import { isActivePayrollItemIdempotencyConflict } from '../payroll/payroll-idempotency';
import {
  PriorNoticeKind,
  PriorNoticeReductionMode,
  PriorNoticeService,
} from './prior-notice/prior-notice.service';
import { RescisaoCalculationService } from './rescisao-calculation.service';
import { RescisaoTerminationService } from './rescisao-termination.service';
import {
  CatalogRow,
  ComputedItemRow,
  PayrollRunRow,
  RescisaoRunResult,
  TerminationContextRow,
  TotalsRow,
} from './rescisao.types';

export type { RescisaoComponent, RescisaoRunResult } from './rescisao.types';

@Injectable()
export class RescisaoService {
  private readonly calculationService: RescisaoCalculationService;
  private readonly terminationService: RescisaoTerminationService;

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly priorNoticeService?: PriorNoticeService,
    @Optional()
    fgtsService?: FgtsService,
    @Optional()
    calculationService?: RescisaoCalculationService,
    @Optional()
    terminationService?: RescisaoTerminationService,
  ) {
    this.calculationService =
      calculationService ?? new RescisaoCalculationService(fgtsService);
    this.terminationService =
      terminationService ?? new RescisaoTerminationService();
  }

  async run(
    employmentLinkId: string,
    terminationDate: string,
    cause: string,
    priorNoticeKind?: PriorNoticeKind,
    priorNoticeReductionMode: PriorNoticeReductionMode = 'NONE',
  ): Promise<RescisaoRunResult> {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for termination payroll processing',
      );
    }

    if (priorNoticeKind && this.priorNoticeService) {
      await this.priorNoticeService.resolve(
        employmentLinkId,
        terminationDate,
        priorNoticeKind,
        priorNoticeReductionMode,
      );
    }

    try {
      return await this.databaseService.transaction(async (client) => {
        const context = await this.loadContext(client, employmentLinkId);
        if (!context) {
          throw new NotFoundException('Employment link not found');
        }

        const terminatedAt = new Date(terminationDate);
        const year = terminatedAt.getUTCFullYear();
        const month = terminatedAt.getUTCMonth() + 1;
        const catalog = await this.ensureCatalog(client);
        const run = await this.ensureRun(client, catalog, context, year, month);
        const recalculated = run.status === 'GENERATED';

        await this.prepareRunForReprocessing(client, run.id, run.status);
        await this.softDeleteCalculatedItems(
          client,
          run.id,
          context.employee_id,
          'calc12.rescisao.reprocessed',
        );

        const components = await this.computeComponents(
          client,
          employmentLinkId,
          terminationDate,
          cause,
        );

        for (const item of components) {
          await this.insertItem(client, {
            employeeId: context.employee_id,
            payrollRunId: run.id,
            year,
            month,
            item,
          });
        }

        const fgtsFine = await this.computeFgtsFine(
          client,
          run.id,
          employmentLinkId,
          cause,
          context,
        );
        for (const item of fgtsFine) {
          await this.insertItem(client, {
            employeeId: context.employee_id,
            payrollRunId: run.id,
            year,
            month,
            item,
          });
          components.push(item);
        }

        const totals = await this.refreshAggregates(client, run.id);
        await this.upsertFinancialRecord(client, context, run.id, year, month);
        await this.linkTermination(client, context, run.id, terminationDate);
        await this.appendHistory(client, run.id, recalculated, {
          employmentLinkId,
          terminationDate,
          cause,
          totals,
        });
        await this.appendAuditEvent(client, run.id, {
          employmentLinkId,
          terminationDate,
          cause,
          totals,
        });

        // ES-03 owns S-2299 dispatch; CALC-12 only prepares the financial termination run.
        return {
          payrollRunId: run.id,
          employmentLinkId,
          employeeId: context.employee_id,
          terminationDate,
          cause,
          status: 'GENERATED',
          employeeCount: Number(totals.employee_count),
          totalEarnings: totals.total_earnings,
          totalDeductions: totals.total_deductions,
          totalNet: totals.total_net,
          components: components.map((item) => ({
            code: item.item_code,
            kind: item.item_kind,
            amount: item.amount,
            referenceValue: item.reference_value,
            quantity: item.quantity,
            metadata: item.metadata ?? {},
          })),
        };
      });
    } catch (error: unknown) {
      if (isActivePayrollItemIdempotencyConflict(error)) {
        throw new ConflictException(
          'Termination payroll reprocessing conflicted with another execution',
        );
      }
      throw error;
    }
  }

  private loadContext(
    client: PoolClient,
    employmentLinkId: string,
  ): Promise<TerminationContextRow | null> {
    return this.terminationService.loadContext(client, employmentLinkId);
  }

  private computeComponents(
    client: PoolClient,
    employmentLinkId: string,
    terminationDate: string,
    cause: string,
  ): Promise<ComputedItemRow[]> {
    return this.calculationService.computeComponents(
      client,
      employmentLinkId,
      terminationDate,
      cause,
    );
  }

  private computeFgtsFine(
    client: PoolClient,
    payrollRunId: string,
    employmentLinkId: string,
    cause: string,
    context: TerminationContextRow,
  ): Promise<ComputedItemRow[]> {
    return this.calculationService.computeFgtsFine(
      client,
      payrollRunId,
      employmentLinkId,
      cause,
      context,
    );
  }

  private ensureCatalog(client: PoolClient): Promise<CatalogRow> {
    return this.calculationService.ensureCatalog(client);
  }

  private ensureRun(
    client: PoolClient,
    catalog: CatalogRow,
    context: TerminationContextRow,
    year: number,
    month: number,
  ): Promise<PayrollRunRow> {
    return this.calculationService.ensureRun(
      client,
      catalog,
      context,
      year,
      month,
    );
  }

  private prepareRunForReprocessing(
    client: PoolClient,
    payrollRunId: string,
    status: string,
  ): Promise<void> {
    return this.calculationService.prepareRunForReprocessing(
      client,
      payrollRunId,
      status,
    );
  }

  private softDeleteCalculatedItems(
    client: PoolClient,
    payrollRunId: string,
    employeeId: string,
    reason: string,
  ): Promise<void> {
    return this.calculationService.softDeleteCalculatedItems(
      client,
      payrollRunId,
      employeeId,
      reason,
    );
  }

  private insertItem(
    client: PoolClient,
    input: {
      employeeId: string;
      payrollRunId: string;
      year: number;
      month: number;
      item: ComputedItemRow;
    },
  ): Promise<void> {
    return this.calculationService.insertItem(client, input);
  }

  private refreshAggregates(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<TotalsRow> {
    return this.calculationService.refreshAggregates(client, payrollRunId);
  }

  private upsertFinancialRecord(
    client: PoolClient,
    context: TerminationContextRow,
    payrollRunId: string,
    year: number,
    month: number,
  ): Promise<void> {
    return this.calculationService.upsertFinancialRecord(
      client,
      context,
      payrollRunId,
      year,
      month,
    );
  }

  private linkTermination(
    client: PoolClient,
    context: TerminationContextRow,
    payrollRunId: string,
    terminationDate: string,
  ): Promise<void> {
    return this.terminationService.linkTermination(
      client,
      context,
      payrollRunId,
      terminationDate,
    );
  }

  private appendHistory(
    client: PoolClient,
    payrollRunId: string,
    recalculated: boolean,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return this.terminationService.appendHistory(
      client,
      payrollRunId,
      recalculated,
      metadata,
    );
  }

  private appendAuditEvent(
    client: PoolClient,
    payrollRunId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return this.terminationService.appendAuditEvent(
      client,
      payrollRunId,
      metadata,
    );
  }
}
