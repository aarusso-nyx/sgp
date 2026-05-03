import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseTotalizerXml, TotalizerParser } from './totalizer.parser';

const tenantId = '00000000-0000-0000-0000-000000005000';

describe('TotalizerParser', () => {
  it.each([
    ['s5001-totalizer.golden.xml', 'S-5001'],
    ['s5002-totalizer.golden.xml', 'S-5002'],
    ['s5011-totalizer.golden.xml', 'S-5011'],
    ['s5012-totalizer.golden.xml', 'S-5012'],
    ['s5013-totalizer.golden.xml', 'S-5013'],
  ] as const)('parses %s as %s', (file, kind) => {
    const parsed = parseTotalizerXml(golden(file));

    expect(parsed.kind).toBe(kind);
    expect(parsed.competence).toBe('2026-01');
    expect(parsed.sourceEventRecibo).toBe('1.1.0000000000000001299');
  });

  it('extracts S-5002 IRRF totals for S-1210 reconciliation', () => {
    const parsed = parseTotalizerXml(golden('s5002-totalizer.golden.xml'));

    expect(parsed.payload).toMatchObject({
      kind: 'S-5002',
      eventElement: 'evtIrrfBenef',
      irrfTotal: '4200.00',
      workers: [
        {
          cpfBenef: '11122233344',
          irrfTotal: '4200.00',
          demonstratives: [
            {
              ideDmDev: 'DM-2025-IRRF',
              irrfTotal: '4200.00',
              monthlyRows: [
                {
                  revenueCode: '056107',
                  taxableIncome: '60000.00',
                  irrf: '4200.00',
                },
              ],
            },
          ],
        },
      ],
    });
    expect(parsed.payload.irrfTotal).toBe(
      sumS1210AnnualIrrf('s1210-irrf-annual.golden.json'),
    );
  });

  it('extracts S-5012 consolidated IRRF totals reconciled with S-5002', () => {
    const s5002 = parseTotalizerXml(golden('s5002-totalizer.golden.xml'));
    const s5012 = parseTotalizerXml(golden('s5012-totalizer.golden.xml'));

    expect(s5012.payload).toMatchObject({
      kind: 'S-5012',
      eventElement: 'evtIrrf',
      irrfTotal: '4200.00',
      monthlyRows: [
        {
          revenueCode: '056107',
          irrf: '4200.00',
        },
      ],
    });
    expect(s5012.payload.irrfTotal).toBe(s5002.payload.irrfTotal);
  });

  it('persists totalizers with the source S-1299 receipt', async () => {
    const database = {
      transaction: jest.fn(async (callback: (client: unknown) => unknown) =>
        callback({
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rows: [
                {
                  tenant_id: tenantId,
                  competence: '2026-01-01',
                  kind: 'S-5011',
                  source_event_recibo: '1.1.0000000000000001299',
                  payload: {},
                  received_at: '2026-05-02T12:00:00.000Z',
                },
              ],
            })
            .mockResolvedValueOnce({ rows: [] }),
        }),
      ),
    };
    const parser = new TotalizerParser(database as never);

    const result = await parser.ingest(
      tenantId,
      golden('s5011-totalizer.golden.xml'),
      new Date('2026-05-02T12:00:00.000Z'),
    );

    expect(result.kind).toBe('S-5011');
    expect(result.sourceEventRecibo).toBe('1.1.0000000000000001299');
  });
});

function golden(file: string): string {
  return readFileSync(join(__dirname, '__fixtures__', file), 'utf8').trim();
}

function sumS1210AnnualIrrf(file: string): string {
  const fixture = JSON.parse(
    readFileSync(
      join(
        __dirname,
        '..',
        '..',
        'report-service',
        'yearly-income',
        '__fixtures__',
        file,
      ),
      'utf8',
    ),
  ) as { competences: Array<{ irrfTotal: string }> };
  const cents = fixture.competences.reduce(
    (sum, competence) => sum + moneyToCents(competence.irrfTotal),
    0n,
  );
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function moneyToCents(value: string): bigint {
  const [reais, cents = ''] = value.split('.');
  return BigInt(reais) * 100n + BigInt(cents.padEnd(2, '0').slice(0, 2));
}
