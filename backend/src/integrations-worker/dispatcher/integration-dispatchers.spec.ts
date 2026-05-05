import type { Cnab240BuildResult } from '../cnab240/cnab240-builder.service';
import {
  Cnab240IntegrationDispatcher,
  type Cnab240Emitter,
} from './cnab240.dispatcher';
import { createIntegrationJobDispatchers } from './default-dispatchers';
import { EvaluationIntegrationDispatcher } from './evaluation.dispatcher';
import { GfipIntegrationDispatcher } from './gfip.dispatcher';
import {
  IntegrationDispatchContext,
  PendingIntegrationJobRow,
  SUPPORTED_DEFINITIONS,
} from './integration-job-dispatcher';
import { PrevidentiaryIntegrationDispatcher } from './previdentiary.dispatcher';

interface TestDispatchContext {
  context: IntegrationDispatchContext;
  query: jest.Mock;
  storeGeneratedObject: jest.Mock;
  persistGeneratedFile: jest.Mock;
  persistDocumentResult: jest.Mock;
}

function readString(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = payload?.[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function requireString(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const value = readString(payload, key);
  if (!value) throw new Error(`Missing required worker parameter: ${key}`);
  return value;
}

function makeJob(
  definitionCode: string,
  parameters: Record<string, unknown>,
  overrides: Partial<PendingIntegrationJobRow> = {},
): PendingIntegrationJobRow {
  return {
    id: 'req-1',
    tenant_id: 'tenant-1',
    definition_code: definitionCode,
    parameters,
    payroll_run_id: null,
    competence_year: 2026,
    competence_month: 4,
    ...overrides,
  } as PendingIntegrationJobRow;
}

function makeContext(): TestDispatchContext {
  const query = jest.fn();
  const storeGeneratedObject = jest.fn();
  const persistGeneratedFile = jest.fn().mockResolvedValue('doc-1');
  const persistDocumentResult = jest.fn(
    async (
      _job: PendingIntegrationJobRow,
      artifact,
      storageKey: string,
      metadata: Record<string, unknown>,
    ) => ({
      format: artifact.format,
      artifact,
      storageKey,
      storageKind: 'LOCAL' as const,
      attachmentId: 'doc-1',
      checksum: 'checksum-1',
      sizeBytes: Buffer.byteLength(String(artifact.content)),
      metadata,
    }),
  );

  const context: IntegrationDispatchContext = {
    databaseService: { query } as never,
    documentsStorageService: { storeGeneratedObject } as never,
    persistGeneratedFile,
    persistDocumentResult,
    requireString,
    readString,
    toDateString(value: string | Date) {
      const date = value instanceof Date ? value : new Date(value);
      return date.toISOString().slice(0, 10);
    },
  };

  return {
    context,
    query,
    storeGeneratedObject,
    persistGeneratedFile,
    persistDocumentResult,
  };
}

describe('integration worker dispatchers', () => {
  it('covers each supported report definition exactly once', () => {
    const dispatchers = createIntegrationJobDispatchers({
      databaseService: { query: jest.fn() } as never,
    });
    const definitions = dispatchers.flatMap(
      (dispatcher) => dispatcher.definitions,
    );

    expect([...definitions].sort()).toEqual([...SUPPORTED_DEFINITIONS].sort());
    expect(new Set(definitions).size).toBe(definitions.length);
  });

  it('dispatches CNAB240 remittance generation and hash persistence', async () => {
    const artifact: Cnab240BuildResult = {
      fileName: 'remessa_000002.rem',
      contentType: 'application/octet-stream',
      format: 'CNAB240',
      content: Buffer.alloc(240, ' '),
      recordCount: 1,
      totalAmount: '100.00',
      fileHash: 'a'.repeat(64),
      layoutVersion: 'CNAB240-TEST',
      details: [],
    };
    const emit = jest.fn().mockResolvedValue(artifact);
    const emitter: Cnab240Emitter = { emit };
    const { context, query, storeGeneratedObject } = makeContext();
    storeGeneratedObject.mockResolvedValue({
      storageKind: 'LOCAL',
      storageKey: 'tenant-1/outputs/remessa/2026/04/remessa_000002.rem',
      sizeBytes: artifact.content.length,
      checksum: artifact.fileHash,
    });

    const result = await new Cnab240IntegrationDispatcher(emitter).process(
      makeJob('FOLHA_CNAB_REMESSA', {
        remittanceId: 'rem-1',
        bankId: 'bank-1',
        remittanceNumber: 2,
      }),
      context,
    );

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ remittanceId: 'rem-1', bankId: 'bank-1' }),
    );
    expect(result.metadata).toMatchObject({
      operation: 'remessa.gerada',
      remittanceId: 'rem-1',
      relay: null,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE payroll.payment_remittance_file'),
      ['rem-1', artifact.fileHash],
    );
  });

  it('dispatches GFIP generation through the shared document result path', async () => {
    const { context, persistDocumentResult } = makeContext();

    await new GfipIntegrationDispatcher().process(
      makeJob(
        'FOLHA_GFIP_GERAR',
        {
          collectionCode: '115',
          modality: '1',
          competenceYear: 2026,
          competenceMonth: 7,
        },
        { competence_year: null, competence_month: null },
      ),
      context,
    );

    expect(persistDocumentResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: 'GFIP' }),
      expect.stringContaining('/outputs/gfip/2026/07/'),
      expect.objectContaining({
        operation: 'gfip.gerada',
        collectionCode: '115',
      }),
    );
  });

  it('dispatches evaluation report generation from HR evaluation rows', async () => {
    const { context, query, persistDocumentResult } = makeContext();
    query.mockResolvedValue([
      {
        evaluation_id: 'eval-1',
        employee_name: 'Maria Servidora',
        registration: '0001',
        period_label: '2026',
        score: '9.50',
        status: 'APPROVED',
        evaluated_on: '2026-04-25',
        evaluator_ref: 'usr-avaliador',
      },
    ]);

    await new EvaluationIntegrationDispatcher().process(
      makeJob('AVALIACAO_FICHA_DESEMPENHO', { evaluationId: 'eval-1' }),
      context,
    );

    expect(persistDocumentResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fileName: 'avaliacao-0001-2026.pdf',
        contentType: 'application/pdf',
      }),
      'tenant-1/outputs/avaliacao/fichas/avaliacao-0001-2026.pdf',
      expect.objectContaining({ operation: 'avaliacao.ficha.gerada' }),
    );
  });

  it('dispatches previdentiary SIPREV export generation', async () => {
    const { context, query, persistDocumentResult } = makeContext();
    query
      .mockResolvedValueOnce([
        {
          id: 'ret-1',
          cpf: '00011122233',
          name: 'Servidor Aposentado',
          granted_on: '2026-05-01',
          legal_basis: 'Lei RPPS',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'pen-1',
          beneficiary_name: 'Dependente Pensionista',
          beneficiary_cpf: '99988877766',
          granted_on: '2026-05-03',
          benefit_type: 'VITALICIA',
        },
      ]);

    await new PrevidentiaryIntegrationDispatcher().process(
      makeJob('PREVIDENCIARIO_SIPREV_EXPORT', { competence: '2026-05' }),
      context,
    );

    expect(persistDocumentResult).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fileName: 'siprev-202605.xml',
        contentType: 'application/xml; charset=utf-8',
      }),
      'tenant-1/outputs/previdenciario/siprev/2026/05/siprev-202605.xml',
      expect.objectContaining({
        operation: 'previdenciario.siprev.exportado',
        retirements: 1,
        pensions: 1,
      }),
    );
  });
});
