import { AfdGeneratorService } from './afd-generator.service';
import { decodeLine, parseAfd } from './afd-layout';

describe('AfdGeneratorService', () => {
  it('generates a valid header and trailer when the period has no markings', async () => {
    const client = {
      query: jest.fn((sql: string) => {
        if (sql.includes('WITH candidate')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('FROM ponto.rep_device')) {
          return Promise.resolve({
            rows: [
              {
                rep_device_id: '00000000-0000-4000-8000-000000000060',
                kind: 'REP_C',
                employer_tax_id: '12345678000199',
                manufacturer: 'Fabricante REP',
              },
            ],
          });
        }
        if (sql.includes('FROM ponto.time_record')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    const database = {
      configured: true,
      transaction: jest.fn((callback: (dbClient: typeof client) => unknown) =>
        Promise.resolve(callback(client)),
      ),
    };
    const service = new AfdGeneratorService(database as never);

    const generated = await service.generateContent({
      repDeviceId: '00000000-0000-4000-8000-000000000060',
      periodStart: '2026-05-01T00:00:00.000Z',
      periodEnd: '2026-05-31T23:59:59.000Z',
    });

    expect(generated.lines).toHaveLength(2);
    expect(decodeLine(generated.lines[0]).type).toBe('1');
    expect(decodeLine(generated.lines[1]).type).toBe('9');
    expect(parseAfd(generated.content).lines).toHaveLength(2);
  });
});
