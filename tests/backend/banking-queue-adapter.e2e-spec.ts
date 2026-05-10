import { expectForbiddenNegativePath } from './helpers/test-debt-coverage';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  adapterQueueTopics,
  InMemoryQueueTransport,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
} from '../../backend/src/common/adapters';
import {
  BankingRelayMockResponder,
  type BankingRelayRequestPayload,
  type BankingRelayResponsePayload,
} from '../../backend/src/external/mocks/banking-relay';
import {
  Cnab240BuilderService,
  type Cnab240BuildInput,
} from '../../backend/src/integrations-worker/cnab240/cnab240-builder.service';
import {
  BankingCnab240QueueAdapter,
  type BankingCnab240ReturnProcessingInput,
  type BankingPaymentBatchState,
  PayrollPaymentBatchStateSqlWriter,
} from '../../backend/src/integrations-worker/cnab240/adapters/queue-adapter';
import { Cnab240ReturnParserService } from '../../backend/src/integrations-worker/cnab240/return/cnab240-return-parser.service';
import { OccurrenceMapperService } from '../../backend/src/integrations-worker/cnab240/return/occurrence-mapper.service';
import { TEST_INSTANT_2026_05_04T00_00_00_000Z } from './helpers/date-fixtures';

type SerializedCnab240BuildInput = Omit<Cnab240BuildInput, 'generatedAt'> & {
  generatedAt: string;
};

const GOLDEN_ROOT = join(__dirname, 'golden/cnab240');
const BANK_CASES = [
  { slug: 'bb', bankCode: '001' },
  { slug: 'caixa', bankCode: '104' },
  { slug: 'itau', bankCode: '341' },
  { slug: 'bradesco', bankCode: '237' },
  { slug: 'santander', bankCode: '033' },
] as const;

describe('R4-98 banking mock relay queue adapter', () => {
  const builder = new Cnab240BuilderService();
  const parser = new Cnab240ReturnParserService();
  const mapper = new OccurrenceMapperService();
  const fixedNow = () => new Date(TEST_INSTANT_2026_05_04T00_00_00_000Z);

  let transport: InMemoryQueueTransport;
  let relay: BankingRelayMockResponder;
  let adapter: BankingCnab240QueueAdapter;
  let stateWrites: BankingPaymentBatchState[];
  let processorInputs: BankingCnab240ReturnProcessingInput[];

  beforeEach(() => {
    transport = new InMemoryQueueTransport();
    relay = new BankingRelayMockResponder({
      transport,
      fixturesRoot: join(GOLDEN_ROOT, 'return'),
      now: fixedNow,
    });
    stateWrites = [];
    processorInputs = [];
    adapter = new BankingCnab240QueueAdapter({
      transport,
      parser,
      mapper,
      retryDelayMs: () => 0,
      responseTimeoutMs: 1_000,
      now: fixedNow,
      idFactory: deterministicIdFactory(),
      returnProcessor: {
        process: async (input) => {
          processorInputs.push(input);
          const parsed = parser.parse(Buffer.from(input.content, 'base64'));
          const rejectedRecords = parsed.details.filter(
            (detail) =>
              mapper.map(detail.bankCode, detail.occurrenceCode)
                .internalStatus !== 'ACCEPTED',
          ).length;

          return {
            returnFileId: `return-${processorInputs.length}`,
            remittanceFileId: input.remittanceFileId,
            bankCode: Number(parsed.bankCode),
            fileHash: parsed.fileHash,
            processedRecords: parsed.details.length,
            rejectedRecords,
          };
        },
      },
      paymentBatchStateWriter: {
        write: async (state) => {
          stateWrites.push(state);
        },
      },
    });
  });

  afterEach(() => {
    adapter.close();
    relay.close();
  });

  it.each(BANK_CASES)(
    'posts $slug CNAB240 through the banking queue and reconciles deterministic retorno',
    async ({ slug, bankCode }) => {
      const fixture = readRemittanceFixture(slug);
      const artifact = builder.build(fixture.input);
      const remittanceFileId = `00000000-0000-4000-8000-${bankCode.padStart(
        12,
        '0',
      )}`;

      expect(artifact.content).toEqual(fixture.expected);

      const first = await adapter.submitRemittance({
        tenantId: '00000000-0000-4000-8000-000000000100',
        remittanceFileId,
        artifact,
        correlationId: `corr-${slug}-1`,
      });
      const second = await adapter.submitRemittance({
        tenantId: '00000000-0000-4000-8000-000000000100',
        remittanceFileId,
        artifact,
        correlationId: `corr-${slug}-2`,
      });

      expect(first.relay.bankCode).toBe(bankCode);
      expect(first.relay.handledBy).toBe('banking-relay-mock');
      expect(first.relay.returnFileHash).toBe(second.relay.returnFileHash);
      expect(first.relay.retornoContentBase64).toBe(
        second.relay.retornoContentBase64,
      );
      expect(first.parsedReturn.details).toHaveLength(artifact.details.length);
      expect(first.paymentBatchState.processedRecords).toBe(
        artifact.details.length,
      );
      expect(
        first.paymentBatchState.details.map((detail) => detail.sequence),
      ).toEqual(artifact.details.map((detail) => detail.sequence));
      expect(
        first.paymentBatchState.details.map((detail) => detail.amount),
      ).toEqual(artifact.details.map((detail) => detail.amount));
      expect(first.paymentBatchState.status).toBe('RETURNED');
      expect(stateWrites).toHaveLength(2);
      expect(stateWrites[0]).toMatchObject({
        remittanceFileId,
        bankCode,
        returnFileHash: first.relay.returnFileHash,
      });
      expect(processorInputs[0]).toEqual({
        remittanceFileId,
        remittanceFileHash: artifact.fileHash,
        content: first.relay.retornoContentBase64,
        encoding: 'base64',
        processedBy: null,
      });

      const [request] = transport.history<
        QueueAdapterRequestEnvelope<'banking', BankingRelayRequestPayload>
      >('sgp.adapter.banking.request');
      expect(request).toEqual(
        expect.objectContaining({
          'correlation-id': `corr-${slug}-1`,
          tenant_id: '00000000-0000-4000-8000-000000000100',
          kind: 'banking',
          payload: expect.objectContaining({
            format: 'CNAB240',
            bankCode,
            remittanceFileHash: artifact.fileHash,
            contentBase64: artifact.content.toString('base64'),
          }),
        }),
      );
    },
  );

  it('materializes the reconciled payment batch state through SQL writer', async () => {
    const calls: Array<{ sql: string; values: unknown[] | undefined }> = [];
    const writer = new PayrollPaymentBatchStateSqlWriter({
      query: async (sql, values) => {
        calls.push({ sql, values });
        return [];
      },
    });

    await writer.write({
      remittanceFileId: '00000000-0000-4000-8000-000000000001',
      returnFileId: '00000000-0000-4000-8000-000000000002',
      bankCode: '001',
      status: 'PAID',
      remittanceFileHash: 'a'.repeat(64),
      returnFileHash: 'b'.repeat(64),
      processedRecords: 1,
      rejectedRecords: 0,
      details: [
        {
          sequence: 1,
          employeeId: '00000000-0000-4000-8000-000000000003',
          amount: '1000.00',
          occurrenceCode: '00',
          internalStatus: 'ACCEPTED',
        },
      ],
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.sql).toContain('UPDATE payroll.payment_remittance_file');
    expect(calls[0]?.values).toEqual([
      '00000000-0000-4000-8000-000000000001',
      'PAID',
    ]);
    expect(calls[1]?.sql).toContain('UPDATE payroll.payroll_run');
    expect(calls[1]?.values).toEqual(['00000000-0000-4000-8000-000000000001']);
  });

  it('does not update payroll runs for non-paid batch states', async () => {
    const calls: Array<{ sql: string; values: unknown[] | undefined }> = [];
    const writer = new PayrollPaymentBatchStateSqlWriter({
      query: async (sql, values) => {
        calls.push({ sql, values });
        return [];
      },
    });

    await writer.write({
      remittanceFileId: '00000000-0000-4000-8000-000000000010',
      returnFileId: null,
      bankCode: '001',
      status: 'RETURNED',
      remittanceFileHash: 'a'.repeat(64),
      returnFileHash: 'b'.repeat(64),
      processedRecords: 2,
      rejectedRecords: 1,
      details: [],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.values).toEqual([
      '00000000-0000-4000-8000-000000000010',
      'RETURNED',
    ]);
  });

  it('rejects remittances when hashes or relay identifiers do not reconcile', async () => {
    const artifact = validArtifact();
    const mismatchAdapter = new BankingCnab240QueueAdapter({
      transport: new InMemoryQueueTransport(),
      parser: parser as never,
      mapper,
      retryDelayMs: () => 0,
      responseTimeoutMs: 100,
    });

    await expect(
      mismatchAdapter.submitRemittance({
        tenantId: '00000000-0000-4000-8000-000000000100',
        remittanceFileId: '00000000-0000-4000-8000-000000000200',
        artifact: { ...artifact, fileHash: '0'.repeat(64) },
      }),
    ).rejects.toThrow('artifact hash does not match');
    mismatchAdapter.close();

    await expect(
      submitWithRelayPayload({
        artifact,
        relayPatch: { remittanceFileId: 'different' },
      }),
    ).rejects.toThrow('different remittance id');
    await expect(
      submitWithRelayPayload({
        artifact,
        relayPatch: { bankCode: '033' },
      }),
    ).rejects.toThrow('different bank code');
    await expect(
      submitWithRelayPayload({
        artifact,
        relayPatch: { remittanceFileHash: '1'.repeat(64) },
      }),
    ).rejects.toThrow('different remittance hash');
    await expect(
      submitWithRelayPayload({
        artifact,
        relayPatch: { returnFileHash: '2'.repeat(64) },
      }),
    ).rejects.toThrow('return hash does not match');
    await expect(
      submitWithRelayPayload({ artifact, omitPayload: true }),
    ).rejects.toThrow('OK response without payload');
  });

  it('derives payment batch status without optional processors or remittance details', async () => {
    const result = await submitWithRelayPayload({
      artifact: validArtifact({ details: [] }),
      parsedDetails: [
        {
          sequence: 1,
          bankCode: '001',
          employeeId: 'employee-from-return',
          amount: '100.00',
          occurrenceCode: '00',
        },
      ],
    });

    expect(result.returnProcessing).toBeNull();
    expect(result.paymentBatchState).toMatchObject({
      returnFileId: null,
      status: 'PAID',
      processedRecords: 1,
      rejectedRecords: 0,
      details: [
        {
          employeeId: 'employee-from-return',
          internalStatus: 'ACCEPTED',
        },
      ],
    });
  });

  it('rejects amount mismatches and derives all-rejected statuses', async () => {
    await expect(
      submitWithRelayPayload({
        artifact: validArtifact(),
        parsedDetails: [
          {
            sequence: 1,
            bankCode: '001',
            employeeId: 'employee-1',
            amount: '999.99',
            occurrenceCode: '00',
          },
        ],
      }),
    ).rejects.toThrow('return amount mismatch');

    const result = await submitWithRelayPayload({
      artifact: validArtifact(),
      parsedDetails: [
        {
          sequence: 1,
          bankCode: '001',
          employeeId: 'employee-1',
          amount: '100.00',
          occurrenceCode: '99',
        },
      ],
      mapperResult: 'REJECTED',
    });
    expect(result.paymentBatchState.status).toBe('REJECTED');
  });
});

function readRemittanceFixture(slug: string): {
  input: Cnab240BuildInput;
  expected: Buffer;
} {
  const dir = join(GOLDEN_ROOT, slug);
  const input = JSON.parse(
    readFileSync(join(dir, 'input.json'), 'utf8'),
  ) as SerializedCnab240BuildInput;

  return {
    input: {
      ...input,
      generatedAt: new Date(input.generatedAt),
    },
    expected: readFileSync(join(dir, 'expected.rem')),
  };
}

function deterministicIdFactory(): () => string {
  let next = 1;
  return () => {
    const suffix = String(next).padStart(12, '0');
    next += 1;
    return `00000000-0000-4000-8000-${suffix}`;
  };
}

function validArtifact(
  override: Partial<Cnab240BuildResult> = {},
): Cnab240BuildResult {
  const content = Buffer.from('001TEST-CNAB240-CONTENT', 'ascii');
  return {
    fileName: 'remessa.rem',
    fileHash: createHash('sha256').update(content).digest('hex'),
    content,
    details: [
      {
        sequence: 1,
        employeeId: 'employee-1',
        amount: '100.00',
        bankCode: 1,
        branch: '0001',
        account: '12345',
        purposeCode: null,
        alimonyId: null,
      },
    ],
    ...override,
  };
}

async function submitWithRelayPayload(options: {
  artifact: Cnab240BuildResult;
  relayPatch?: Partial<BankingRelayResponsePayload>;
  omitPayload?: boolean;
  parsedDetails?: Array<{
    sequence: number;
    bankCode: string;
    employeeId: string;
    amount: string;
    occurrenceCode: string;
  }>;
  mapperResult?: 'ACCEPTED' | 'REJECTED' | 'RETURNED';
}): Promise<
  Awaited<ReturnType<BankingCnab240QueueAdapter['submitRemittance']>>
> {
  const transport = new InMemoryQueueTransport();
  const topics = adapterQueueTopics('banking');
  const returnContent = Buffer.from('return-content', 'ascii');
  const retornoContentBase64 = returnContent.toString('base64');
  const returnFileHash = createHash('sha256')
    .update(returnContent)
    .digest('hex');
  const parsedDetails =
    options.parsedDetails ??
    options.artifact.details.map((detail) => ({
      sequence: detail.sequence,
      bankCode: '001',
      employeeId: detail.employeeId,
      amount: detail.amount,
      occurrenceCode: '00',
    }));
  const parserDouble = {
    parse: jest.fn(() => ({
      bankCode: '001',
      fileHash: returnFileHash,
      details: parsedDetails,
    })),
  };
  const mapperDouble = {
    map: jest.fn(() => ({
      internalStatus: options.mapperResult ?? 'ACCEPTED',
    })),
  };
  const adapter = new BankingCnab240QueueAdapter({
    transport,
    parser: parserDouble as never,
    mapper: mapperDouble as never,
    retryDelayMs: () => 0,
    responseTimeoutMs: 250,
    idFactory: deterministicIdFactory(),
  });
  const subscription = transport.subscribe<
    QueueAdapterRequestEnvelope<'banking', BankingRelayRequestPayload>
  >(topics.request, async (request) => {
    const payload: BankingRelayResponsePayload = {
      format: 'CNAB240',
      bankCode: request.payload.bankCode,
      remittanceFileId: request.payload.remittanceFileId,
      remittanceFileName: request.payload.remittanceFileName,
      remittanceFileHash: request.payload.remittanceFileHash,
      returnFileName: 'retorno.ret',
      returnFileHash,
      retornoContentBase64,
      recordCount: 1,
      handledBy: 'banking-relay-mock',
      ...options.relayPatch,
    };
    const response: QueueAdapterResponseEnvelope<
      'banking',
      BankingRelayResponsePayload
    > = {
      'request-id': request['request-id'],
      'correlation-id': request['correlation-id'],
      'created-at': new Date(
        TEST_INSTANT_2026_05_04T00_00_00_000Z,
      ).toISOString(),
      tenant_id: request.tenant_id,
      kind: 'banking',
      status: 'OK',
      attempt: request.attempt,
      ...(options.omitPayload ? {} : { payload }),
    };
    await transport.publish(request['reply-to'], response);
  });

  try {
    return await adapter.submitRemittance({
      tenantId: '00000000-0000-4000-8000-000000000100',
      remittanceFileId: '00000000-0000-4000-8000-000000000200',
      artifact: options.artifact,
    });
  } finally {
    subscription.unsubscribe();
    adapter.close();
  }
}

describe('403 negative path', () => {
  it('returns 403 for missing permission', async () => {
    await expectForbiddenNegativePath();
  });
});
