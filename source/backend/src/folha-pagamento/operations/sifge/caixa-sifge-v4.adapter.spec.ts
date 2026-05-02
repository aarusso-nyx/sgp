import { CaixaSifgeMockAdapter } from './caixa-sifge-mock.adapter';
import { CaixaSifgeV4Adapter } from './caixa-sifge-v4.adapter';
import { SifgePayload } from './caixa-adapter.contract';

describe('CaixaSifgeV4Adapter', () => {
  const payload: SifgePayload = {
    header: {
      tenantId: '00000000-0000-0000-0000-000000000175',
      remittanceId: '10000000-0000-0000-0000-000000000001',
      competence: '2026-04-01',
      kind: 'GRF_MONTHLY',
      generatedAt: '2026-05-02T12:00:00.000Z',
      daeBarcode: '12345678901234567890123456789012345678901234',
    },
    totals: {
      employeeCount: 2,
      totalBase: '2000.00',
      totalAmount: '160.00',
    },
    records: [
      {
        employeeId: '20000000-0000-0000-0000-000000000002',
        employmentLinkId: '30000000-0000-0000-0000-000000000002',
        payrollRunId: '40000000-0000-0000-0000-000000000001',
        baseAmount: '1000.00',
        rate: '0.080000',
        amount: '80.00',
        movementId: '50000000-0000-0000-0000-000000000002',
      },
      {
        employeeId: '20000000-0000-0000-0000-000000000001',
        employmentLinkId: '30000000-0000-0000-0000-000000000001',
        payrollRunId: '40000000-0000-0000-0000-000000000001',
        baseAmount: '1000.00',
        rate: '0.080000',
        amount: '80.00',
        movementId: '50000000-0000-0000-0000-000000000001',
      },
    ],
  };

  it('round-trips SIFGE 4.0 payloads and preserves all fields', () => {
    const adapter = new CaixaSifgeV4Adapter();
    const signed = adapter.signIfRequired(adapter.assemble(payload));
    const parsed = adapter.parse(signed);

    expect(parsed.layoutVersion).toBe('SIFGE-4.0');
    expect(parsed.adapterKey).toBe('caixa-sifge-v4');
    expect(parsed.signed).toBe(true);
    expect(parsed.header).toEqual(payload.header);
    expect(parsed.totals).toEqual(payload.totals);
    expect(parsed.records).toEqual([payload.records[1], payload.records[0]]);
  });

  it('keeps the mock adapter unsigned without changing the contract', () => {
    const adapter = new CaixaSifgeMockAdapter();
    const assembled = adapter.assemble(payload);
    const parsed = adapter.parse(adapter.signIfRequired(assembled));

    expect(parsed.adapterKey).toBe('caixa-sifge-mock');
    expect(parsed.layoutVersion).toBe('SIFGE-MOCK-4.0');
    expect(parsed.signed).toBe(false);
  });
});
