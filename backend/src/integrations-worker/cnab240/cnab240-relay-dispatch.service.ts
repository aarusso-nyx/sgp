import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { InMemoryQueueTransport } from '../../common/adapters';
import { DatabaseService } from '../../database/database.service';
import { BankingRelayMockResponder } from '../../external/mocks/banking-relay';
import type { Cnab240BuildResult } from './cnab240-builder.service';
import {
  BankingCnab240QueueAdapter,
  type BankingQueueDatabase,
  PayrollPaymentBatchStateSqlWriter,
  type SubmitBankingRemittanceResult,
} from './adapters/queue-adapter';
import { Cnab240ReturnParserService } from './return/cnab240-return-parser.service';
import { Cnab240ReturnProcessService } from './return/cnab240-return-process.service';
import { OccurrenceMapperService } from './return/occurrence-mapper.service';

export type Cnab240RelayDispatchInput = Readonly<{
  tenantId: string;
  remittanceFileId: string;
  bankId: string;
  artifact: Cnab240BuildResult;
  processedBy?: string | null;
  requestId?: string;
  correlationId?: string;
  idempotencyKey?: string;
}>;

@Injectable()
export class Cnab240RelayDispatchService implements OnModuleDestroy {
  private readonly transport: InMemoryQueueTransport;
  private readonly relay: BankingRelayMockResponder;
  private readonly queueAdapter: BankingCnab240QueueAdapter;

  constructor(
    databaseService: DatabaseService,
    returnProcessService: Cnab240ReturnProcessService,
    parser: Cnab240ReturnParserService,
    mapper: OccurrenceMapperService,
  ) {
    this.transport = new InMemoryQueueTransport();
    this.relay = new BankingRelayMockResponder({
      transport: this.transport,
      fixturesRoot: resolveBankingRelayFixturesRoot(),
    });
    this.queueAdapter = new BankingCnab240QueueAdapter({
      transport: this.transport,
      returnProcessor: returnProcessService,
      paymentBatchStateWriter: new PayrollPaymentBatchStateSqlWriter(
        toBankingQueueDatabase(databaseService),
      ),
      parser,
      mapper,
      retryDelayMs: () => 0,
    });
  }

  async submitGeneratedRemittance(
    input: Cnab240RelayDispatchInput,
  ): Promise<SubmitBankingRemittanceResult> {
    return this.queueAdapter.submitRemittance({
      tenantId: input.tenantId,
      remittanceFileId: input.remittanceFileId,
      artifact: input.artifact,
      bankCode: input.bankId,
      processedBy: input.processedBy ?? null,
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  onModuleDestroy(): void {
    this.queueAdapter.close();
    this.relay.close();
  }
}

function toBankingQueueDatabase(
  databaseService: DatabaseService,
): BankingQueueDatabase {
  return {
    query: async <T = unknown>(sql: string, values?: unknown[]) =>
      (await databaseService.query(sql, values)) as T[],
  };
}

function resolveBankingRelayFixturesRoot(): string {
  const candidates = [
    join(process.cwd(), 'tests/backend/golden/cnab240/return'),
    join(process.cwd(), '../tests/backend/golden/cnab240/return'),
  ];
  return (
    candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!
  );
}
