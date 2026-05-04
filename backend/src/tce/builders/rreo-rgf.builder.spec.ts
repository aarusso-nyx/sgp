import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  adapterQueueTopics,
  InMemoryQueueTransport,
  SgpQueueAdapter,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueSubscription,
} from '../../common/adapters/queue-adapter';
import {
  buildRreoFiscalReport,
  type RreoBuilderInput,
  type RreoFiscalReportEnvelope,
} from './rreo.builder';
import {
  buildRgfFiscalReport,
  type RgfBuilderInput,
  type RgfFiscalReportEnvelope,
} from './rgf.builder';

const goldenRoot = join(__dirname, '../../../../tests/backend/golden/tce');
const updateGoldens = process.env.SGP_UPDATE_R4_15_GOLDENS === '1';

type FiscalReportEnvelope = RreoFiscalReportEnvelope | RgfFiscalReportEnvelope;

interface TceStubAck {
  protocol: string;
  reportType: 'RREO' | 'RGF';
  stateCode: string;
  accepted: true;
  sourceStatus: 'SANDBOX_ACK';
}

describe('TCE RREO/RGF builders', () => {
  it.each([
    ['rreo-v01/sp', buildRreoFiscalReport],
    ['rreo-v01/mg', buildRreoFiscalReport],
  ] as const)('matches the %s golden byte-for-byte', (fixture, build) => {
    const input = readJson<RreoBuilderInput>(fixture, 'input.json');
    const envelope = build(input);
    const actual = prettyJson(envelope);

    expect(envelope).toMatchObject({
      schemaVersion: 'tce-rreo-v01',
      reportType: 'RREO',
      sourceStatus: 'CALLER_SELECTED_LRF_STRUCTURE',
      officialConformance: false,
      target: {
        stateCode: input.targetState,
        layoutStatus: 'UNVERIFIED_LAYOUT',
      },
      summary: {
        lineCount: input.lines.length,
      },
    });
    expect(actual).toBe(goldenText(fixture, 'expected.json', actual));
  });

  it.each([
    ['rgf-v01/sp', buildRgfFiscalReport],
    ['rgf-v01/mg', buildRgfFiscalReport],
  ] as const)('matches the %s golden byte-for-byte', (fixture, build) => {
    const input = readJson<RgfBuilderInput>(fixture, 'input.json');
    const envelope = build(input);
    const actual = prettyJson(envelope);

    expect(envelope).toMatchObject({
      schemaVersion: 'tce-rgf-v01',
      reportType: 'RGF',
      sourceStatus: 'CALLER_SELECTED_LRF_STRUCTURE',
      officialConformance: false,
      target: {
        stateCode: input.targetState,
        layoutStatus: 'UNVERIFIED_LAYOUT',
      },
      summary: {
        lineCount: input.lines.length,
      },
    });
    expect(actual).toBe(goldenText(fixture, 'expected.json', actual));
  });

  it('rejects report-period mismatches before serialization', () => {
    const input = readJson<RreoBuilderInput>('rreo-v01/sp', 'input.json');

    expect(() =>
      buildRreoFiscalReport({
        ...input,
        period: { ...input.period, periodKind: 'QUADRIMESTER' as never },
      }),
    ).toThrow('RREO periodKind must be BIMESTER.');
  });

  it('exercises the R4-95 queue contract with builder payloads and a local stub', async () => {
    const topics = adapterQueueTopics('tce');
    const transport = new InMemoryQueueTransport();
    const adapter = new SgpQueueAdapter({
      kind: 'tce',
      transport,
      retryDelayMs: () => 0,
      responseTimeoutMs: 1_000,
      now: () => new Date('2026-05-04T10:30:00.000Z'),
    });

    const subscription: QueueSubscription = transport.subscribe<
      QueueAdapterRequestEnvelope<'tce', FiscalReportEnvelope>
    >(topics.request, async (request) => {
      const response: QueueAdapterResponseEnvelope<'tce', TceStubAck> = {
        'request-id': request['request-id'],
        'correlation-id': request['correlation-id'],
        'created-at': '2026-05-04T10:30:01.000Z',
        tenant_id: request.tenant_id,
        kind: request.kind,
        status: 'OK',
        attempt: request.attempt,
        payload: {
          protocol: [
            'TCE-STUB',
            request.payload.target.stateCode,
            request.payload.reportType,
            request.payload.evidenceHash.slice(0, 12).toUpperCase(),
          ].join('-'),
          reportType: request.payload.reportType,
          stateCode: request.payload.target.stateCode,
          accepted: true,
          sourceStatus: 'SANDBOX_ACK',
        },
      };
      await transport.publish(request['reply-to'], response);
    });

    try {
      const reports = [
        buildRreoFiscalReport(
          readJson<RreoBuilderInput>('rreo-v01/sp', 'input.json'),
        ),
        buildRgfFiscalReport(
          readJson<RgfBuilderInput>('rgf-v01/mg', 'input.json'),
        ),
      ];
      const responses = await Promise.all(
        reports.map((report) =>
          adapter.request<FiscalReportEnvelope, TceStubAck>({
            tenantId: report.entity.tenantId,
            idempotencyKey: report.idempotencyKey,
            correlationId: `r4-15-${report.reportType.toLowerCase()}-${report.target.stateCode.toLowerCase()}`,
            payload: report,
          }),
        ),
      );

      expect(responses.map((response) => response.payload)).toEqual([
        expect.objectContaining({
          protocol: expect.stringMatching(/^TCE-STUB-SP-RREO-/),
          reportType: 'RREO',
          stateCode: 'SP',
          accepted: true,
        }),
        expect.objectContaining({
          protocol: expect.stringMatching(/^TCE-STUB-MG-RGF-/),
          reportType: 'RGF',
          stateCode: 'MG',
          accepted: true,
        }),
      ]);
      expect(
        transport.history<
          QueueAdapterRequestEnvelope<'tce', FiscalReportEnvelope>
        >(topics.request),
      ).toHaveLength(2);
    } finally {
      adapter.close();
      subscription.unsubscribe();
    }
  });
});

function readJson<T>(fixture: string, name: string): T {
  return JSON.parse(readFileSync(join(goldenRoot, fixture, name), 'utf8')) as T;
}

function goldenText(fixture: string, name: string, actual: string): string {
  const path = join(goldenRoot, fixture, name);
  if (updateGoldens || !existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${actual}\n`, 'utf8');
  }
  return readFileSync(path, 'utf8').trimEnd();
}

function prettyJson(envelope: FiscalReportEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}
