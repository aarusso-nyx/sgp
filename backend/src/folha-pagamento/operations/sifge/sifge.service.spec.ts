import { CaixaSifgeMockAdapter } from './caixa-sifge-mock.adapter';
import { CaixaSifgeV4Adapter } from './caixa-sifge-v4.adapter';
import { SifgeService } from './sifge.service';

const tenantId = '00000000-0000-0000-0000-000000000175';
const payrollRunId = '40000000-0000-0000-0000-000000000175';
const remittanceId = '60000000-0000-0000-0000-000000000175';

describe('SifgeService', () => {
  it('generates a monthly GRF for 10 CLT employees from FGTS movements', async () => {
    const database = fakeDatabase();
    const service = new SifgeService(database as never, [
      new CaixaSifgeV4Adapter(),
      new CaixaSifgeMockAdapter(),
    ]);

    const result = await service.generateMonthlyGRF(tenantId, '2026-04');

    expect(result.kind).toBe('GRF_MONTHLY');
    expect(result.totalBase).toBe('10000.00');
    expect(result.totalAmount).toBe('800.00');
    expect(result.signed).toBe(true);
    expect(result.fileContentBase64).toBeTruthy();
    const parsed = new CaixaSifgeV4Adapter().parse(
      Buffer.from(result.fileContentBase64 ?? '', 'base64'),
    );
    expect(parsed.records).toHaveLength(10);
    expect(parsed.totals.employeeCount).toBe(10);
  });

  it('uses the configured mock adapter without service changes', async () => {
    const database = fakeDatabase('caixa-sifge-mock');
    const service = new SifgeService(database as never, [
      new CaixaSifgeV4Adapter(),
      new CaixaSifgeMockAdapter(),
    ]);

    const result = await service.generateMonthlyGRF(tenantId, '2026-04');

    expect(result.adapterKey).toBe('caixa-sifge-mock');
    expect(result.layoutVersion).toBe('SIFGE-MOCK-4.0');
    expect(result.signed).toBe(false);
  });
});

function fakeDatabase(adapterKey?: string) {
  const client = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM payment.fgts_caixa_adapter')) {
        return {
          rows: adapterKey
            ? [{ adapter_key: adapterKey, layout_version: 'SIFGE-MOCK-4.0' }]
            : [],
        };
      }
      if (sql.includes('GROUP BY movement.payroll_run_id')) {
        return {
          rows: [
            {
              payroll_run_id: payrollRunId,
              employee_count: '10',
              base_amount: '10000.00',
              rate: '0.080000',
              amount: '800.00',
            },
          ],
        };
      }
      if (sql.includes('movement.fgts_movement_id::text AS movement_id')) {
        return {
          rows: Array.from({ length: 10 }, (_, index) => ({
            employee_id: `20000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
            employment_link_id: `30000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
            payroll_run_id: payrollRunId,
            base_amount: '1000.00',
            rate: '0.080000',
            amount: '80.00',
            movement_id: `50000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
          })),
        };
      }
      if (sql.includes('INSERT INTO payment.fgts_remittance')) {
        return { rows: [remittanceRow(adapterKey)] };
      }
      if (sql.includes('UPDATE payment.fgts_remittance')) {
        return {
          rows: [
            {
              ...remittanceRow(adapterKey),
              file_uri: `sifge://fgts-remittances/${remittanceId}.sifge`,
              file_hash: 'hash',
              signed: adapterKey !== 'caixa-sifge-mock',
            },
          ],
        };
      }
      return { rows: [] };
    }),
  };
  return {
    configured: true,
    transaction: async (callback: (tx: typeof client) => Promise<unknown>) =>
      callback(client),
  };
}

function remittanceRow(adapterKey?: string) {
  return {
    id: remittanceId,
    tenant_id: tenantId,
    competence: '2026-04-01',
    kind: 'GRF_MONTHLY',
    status: 'GENERATED',
    generated_at: '2026-05-02T12:00:00.000Z',
    paid_at: null,
    total_base: '10000.00',
    total_amount: '800.00',
    file_uri: null,
    dae_barcode: '12345678901234567890123456789012345678901234',
    layout_version:
      adapterKey === 'caixa-sifge-mock' ? 'SIFGE-MOCK-4.0' : 'SIFGE-4.0',
    adapter_key: adapterKey ?? 'caixa-sifge-v4',
    file_hash: null,
    signed: false,
    created_at: '2026-05-02T12:00:00.000Z',
    updated_at: '2026-05-02T12:00:00.000Z',
  };
}
