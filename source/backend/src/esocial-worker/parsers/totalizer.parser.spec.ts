import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseTotalizerXml, TotalizerParser } from './totalizer.parser';

const tenantId = '00000000-0000-0000-0000-000000005000';

describe('TotalizerParser', () => {
  it.each([
    ['s5001-totalizer.golden.xml', 'S-5001'],
    ['s5011-totalizer.golden.xml', 'S-5011'],
    ['s5013-totalizer.golden.xml', 'S-5013'],
  ] as const)('parses %s as %s', (file, kind) => {
    const parsed = parseTotalizerXml(golden(file));

    expect(parsed.kind).toBe(kind);
    expect(parsed.competence).toBe('2026-01');
    expect(parsed.sourceEventRecibo).toBe('1.1.0000000000000001299');
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
