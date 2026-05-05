import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AfdtAcjefGeneratorService } from './afdt-acjef-generator.service';
import { TEST_INSTANT_2026_05_02T12_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('AfdtAcjefGeneratorService', () => {
  const input = {
    repDeviceId: '00000000-0000-4000-8000-000000000060',
    periodStart: '2026-05-01T00:00:00.000Z',
    periodEnd: '2026-05-31T23:59:59.000Z',
  };

  beforeEach(() => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date(TEST_INSTANT_2026_05_02T12_00_00_000Z));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('generates the AFDT golden flat file from time records', async () => {
    const service = new AfdtAcjefGeneratorService(mockDatabase() as never);
    const generated = await service.generateAfdtContent(input);

    expect(generated.content).toBe(golden('afdt.golden.txt'));
    expect(generated.lineCount).toBe(4);
    expect(generated.fileSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates the ACJEF golden flat file from timesheet aggregation', async () => {
    const service = new AfdtAcjefGeneratorService(mockDatabase() as never);
    const generated = await service.generateAcjefContent(input);

    expect(generated.content).toBe(golden('acjef.golden.txt'));
    expect(generated.lineCount).toBe(3);
    expect(generated.fileSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

function golden(fileName: string): string {
  return readFileSync(join(__dirname, '__fixtures__', fileName), 'utf8');
}

function mockDatabase() {
  const client = {
    query: jest.fn((sql: string) => {
      if (sql.includes('FROM ponto.rep_device')) {
        return Promise.resolve({
          rows: [
            {
              rep_device_id: '00000000-0000-4000-8000-000000000060',
              employer_tax_id: '12345678000199',
            },
          ],
        });
      }

      if (sql.includes('SELECT tr.employee_id::text')) {
        return Promise.resolve({
          rows: [
            {
              employee_id: '00000000-0000-4000-8000-000000000101',
              employee_registration: 'MAT-101',
              employee_cpf: '12345678901',
              employee_name: 'Servidor Um',
              recorded_at: '2026-05-02T11:00:00.000Z',
              source: 'REP_C',
              nsr: '10',
              record_hash: Buffer.from('a'.repeat(64), 'hex'),
            },
            {
              employee_id: '00000000-0000-4000-8000-000000000101',
              employee_registration: 'MAT-101',
              employee_cpf: '12345678901',
              employee_name: 'Servidor Um',
              recorded_at: '2026-05-02T15:00:00.000Z',
              source: 'REP_C',
              nsr: '11',
              record_hash: Buffer.from('b'.repeat(64), 'hex'),
            },
          ],
        });
      }

      if (sql.includes('WITH employees AS')) {
        return Promise.resolve({
          rows: [
            {
              employee_id: '00000000-0000-4000-8000-000000000101',
              employee_registration: 'MAT-101',
              employee_cpf: '12345678901',
              employee_name: 'Servidor Um',
              period_start: '2026-05-01T00:00:00.000Z',
              period_end: '2026-05-31T00:00:00.000Z',
              worked_minutes: 480,
              expected_minutes: 480,
              overtime_50_minutes: 0,
              overtime_100_minutes: 0,
              night_minutes: 60,
              late_minutes: 0,
              absence_unpaid_minutes: 0,
              absence_paid_minutes: 0,
              hour_bank_settlement_minutes: 0,
            },
          ],
        });
      }

      return Promise.resolve({ rows: [] });
    }),
  };

  return {
    configured: true,
    transaction: jest.fn((callback: (dbClient: typeof client) => unknown) =>
      Promise.resolve(callback(client)),
    ),
  };
}
