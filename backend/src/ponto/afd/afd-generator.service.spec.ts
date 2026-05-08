import { AfdGeneratorService } from './afd-generator.service';
import { decodeLine, parseAfd } from './afd-layout';
import { TEST_INSTANT_2026_05_02T12_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('AfdGeneratorService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('exports REP-P, REP-A, and REP-C markings with deterministic Portaria 671 fields', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date(TEST_INSTANT_2026_05_02T12_00_00_000Z));
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
                manufacturer: 'Prefeitura Municipal',
              },
            ],
          });
        }
        if (sql.includes('FROM ponto.time_record')) {
          return Promise.resolve({
            rows: [
              {
                employee_id: '00000000-0000-4000-8000-000000000101',
                registration: 'MAT-REP-P-001',
                employee_name: 'Servidor REP P',
                recorded_at: '2026-05-02T11:00:00.000Z',
                source: 'REP_P',
                nsr: '10',
                record_hash: Buffer.from('1'.repeat(64), 'hex'),
              },
              {
                employee_id: '00000000-0000-4000-8000-000000000102',
                registration: 'MAT-REP-A-001',
                employee_name: 'Servidor REP A',
                recorded_at: '2026-05-02T12:00:00.000Z',
                source: 'REP_A',
                nsr: '11',
                record_hash: Buffer.from('2'.repeat(64), 'hex'),
              },
              {
                employee_id: '00000000-0000-4000-8000-000000000103',
                registration: 'MAT-REP-C-001',
                employee_name: 'Servidor REP C',
                recorded_at: '2026-05-02T13:00:00.000Z',
                source: 'REP_C',
                nsr: '12',
                record_hash: Buffer.from('3'.repeat(64), 'hex'),
              },
            ],
          });
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
    const parsed = parseAfd(generated.content);

    expect(parsed.lines).toHaveLength(5);
    expect(
      parsed.records
        .filter((record) => record.type === '4')
        .map((record) => ({
          nsr: record.nsr,
          source: record.fields['source'],
          employeeIdentifier: record.fields['employeeIdentifier'],
          recordHash: record.fields['recordHash'],
        })),
    ).toEqual([
      {
        nsr: 10,
        source: 'REP_P',
        employeeIdentifier: 'MAT-REP-P-001',
        recordHash: '1'.repeat(64),
      },
      {
        nsr: 11,
        source: 'REP_A',
        employeeIdentifier: 'MAT-REP-A-001',
        recordHash: '2'.repeat(64),
      },
      {
        nsr: 12,
        source: 'REP_C',
        employeeIdentifier: 'MAT-REP-C-001',
        recordHash: '3'.repeat(64),
      },
    ]);
    expect(parsed.trailer.nsr).toBe(13);
  });
});
