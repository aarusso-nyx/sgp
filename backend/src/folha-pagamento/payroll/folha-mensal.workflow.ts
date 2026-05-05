import { ServiceUnavailableException } from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { FolhaMensalCompetenceDto } from './payroll.dto';
import {
  appendMonthlyAuditEvent,
  appendMonthlyRunHistory,
  assertMonthlyCompetenceStatus,
  buildMonthlyResult,
  deleteMonthlyFinancialRecords,
  ensureMonthlyCatalog,
  ensureMonthlyCompetence,
  ensureMonthlyRun,
  loadMonthlyContext,
  refreshMonthlyFinancialRecords,
  refreshMonthlyRunTotals,
  reopenMonthlyCompetenceStatus,
  reopenMonthlyRunStatus,
  softDeleteMonthlyCalculatedItems,
  updateMonthlyCompetenceStatus,
  updateMonthlyRunStatus,
  validateMonthlyRun,
  insertMonthlyCalculatedItems,
} from './folha-mensal';
import {
  CatalogRow,
  CompetenceRow,
  CompetenceStatus,
  FolhaMensalResult,
  PayrollRunStatus,
  RunRow,
} from './folha-mensal.types';

export class FolhaMensalWorkflow {
  constructor(private readonly databaseService: DatabaseService) {}

  ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for monthly payroll operations',
      );
    }
  }

  transaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.databaseService.transaction(handler);
  }

  ensureCatalog(client: PoolClient): Promise<CatalogRow> {
    return ensureMonthlyCatalog(client);
  }

  ensureCompetence(
    client: PoolClient,
    input: FolhaMensalCompetenceDto,
    status: CompetenceStatus,
  ): Promise<CompetenceRow> {
    return ensureMonthlyCompetence(client, input, status);
  }

  ensureRun(
    client: PoolClient,
    catalog: CatalogRow,
    input: FolhaMensalCompetenceDto,
    status: PayrollRunStatus,
  ): Promise<RunRow> {
    return ensureMonthlyRun(client, catalog, input, status);
  }

  loadContext(client: PoolClient, input: FolhaMensalCompetenceDto) {
    return loadMonthlyContext(client, input);
  }

  assertCompetenceStatus(
    current: CompetenceStatus,
    allowed: CompetenceStatus[],
  ): void {
    assertMonthlyCompetenceStatus(current, allowed);
  }

  updateCompetenceStatus(
    client: PoolClient,
    competenceId: string,
    status: CompetenceStatus,
  ): Promise<void> {
    return updateMonthlyCompetenceStatus(client, competenceId, status);
  }

  reopenCompetenceStatus(
    client: PoolClient,
    competenceId: string,
  ): Promise<void> {
    return reopenMonthlyCompetenceStatus(client, competenceId);
  }

  updateRunStatus(
    client: PoolClient,
    payrollRunId: string,
    status: PayrollRunStatus,
  ): Promise<void> {
    return updateMonthlyRunStatus(client, payrollRunId, status);
  }

  reopenRunStatus(client: PoolClient, payrollRunId: string): Promise<void> {
    return reopenMonthlyRunStatus(client, payrollRunId);
  }

  softDeleteCalculatedItems(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<void> {
    return softDeleteMonthlyCalculatedItems(client, payrollRunId);
  }

  deleteFinancialRecords(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<void> {
    return deleteMonthlyFinancialRecords(client, payrollRunId);
  }

  insertMonthlyCalculatedItems(
    client: PoolClient,
    payrollRunId: string,
    payrollTypeId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<number> {
    return insertMonthlyCalculatedItems(
      client,
      payrollRunId,
      payrollTypeId,
      input,
    );
  }

  refreshFinancialRecords(
    client: PoolClient,
    payrollRunId: string,
    input: FolhaMensalCompetenceDto,
  ): Promise<void> {
    return refreshMonthlyFinancialRecords(client, payrollRunId, input);
  }

  refreshRunTotals(
    client: PoolClient,
    payrollRunId: string,
    status: PayrollRunStatus,
  ): Promise<void> {
    return refreshMonthlyRunTotals(client, payrollRunId, status);
  }

  validateRun(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<Record<string, unknown>> {
    return validateMonthlyRun(client, payrollRunId);
  }

  appendHistory(
    client: PoolClient,
    payrollRunId: string,
    status: PayrollRunStatus,
    note: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return appendMonthlyRunHistory(
      client,
      payrollRunId,
      status,
      note,
      metadata,
    );
  }

  appendAuditEvent(
    client: PoolClient,
    payrollRunId: string,
    event: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return appendMonthlyAuditEvent(client, payrollRunId, event, metadata);
  }

  buildResult(
    client: PoolClient,
    competenceId: string,
    payrollRunId: string,
    validation?: Record<string, unknown>,
  ): Promise<FolhaMensalResult> {
    return buildMonthlyResult(client, competenceId, payrollRunId, validation);
  }
}
