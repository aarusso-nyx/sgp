import { RequestContextStore } from '../../common/request-context/request-context.store';
import { GPSDuplicatesDCTFWebError } from './gps.errors';
import { calculateGpsLateCharges } from './gps-late-charges';
import { GpsService } from './gps.service';
import { GpsTxtSerializer } from './gps-txt.serializer';
import { TEST_INSTANT_2026_04_30T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

const tenantId = '00000000-0000-0000-0000-00000000f504';
const paymentCodeId = '00000000-0000-4000-8000-000000002402';
const remittanceId = '00000000-0000-4000-8000-00000000f504';

interface TestDbClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

describe('GpsService', () => {
  beforeEach(() => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date(TEST_INSTANT_2026_04_30T00_00_00_000Z));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('generates retroactive GPS and calculates late charges without binary floats', async () => {
    const inserted: Record<string, unknown> = {};
    const db = {
      configured: true,
      query: jest.fn().mockResolvedValueOnce([remittanceRow()]),
      transaction: jest.fn(
        async (callback: (client: TestDbClient) => Promise<unknown>) =>
          callback({
            query: jest.fn(async (sql: string, values: unknown[] = []) => {
              if (sql.includes('assert_no_dctfweb_for_competence')) {
                return { rows: [] };
              }
              if (sql.includes('FROM fiscal.gps_payment_code')) {
                return {
                  rows: [
                    {
                      id: paymentCodeId,
                      code: '2402',
                      description: 'Orgaos do poder publico',
                      applies_to: 'BOTH',
                      active: true,
                      valid_from: '1999-01-01',
                      valid_to: null,
                    },
                  ],
                };
              }
              if (sql.includes('FROM payroll.v_payroll_run_line_active')) {
                return { rows: [{ base_amount: '1000.00', amount: '110.00' }] };
              }
              if (sql.includes('payroll_calc.evaluate_earning_deduction')) {
                return { rows: [] };
              }
              if (sql.includes('INSERT INTO fiscal.gps_remittance')) {
                inserted.amount = values[6];
                inserted.interestAmount = values[7];
                inserted.fineAmount = values[8];
                inserted.totalAmount = values[9];
                inserted.txt = values[11];
                return { rows: [{ id: remittanceId }] };
              }
              return { rows: [] };
            }),
          }),
      ),
    };
    const service = new GpsService(db as never, new GpsTxtSerializer());

    const result = await RequestContextStore.run(
      { tenantId, permissions: ['fiscal.gps.read', 'fiscal.gps.write'] },
      () =>
        service.generateResidualGPS({
          competence: '2026-03-01',
          paymentCodeId,
          reason: 'RETROACTIVE',
          reasonDetail: 'Competencia anterior a adesao eSocial',
        }),
    );

    expect(result.totalAmount).toBe('113.99');
    expect(inserted.amount).toBe('110.00');
    expect(inserted.interestAmount).toBe('0.37');
    expect(inserted.fineAmount).toBe('3.63');
    expect(String(inserted.txt)).toContain('GPS|GPS-IN925-2009|');
  });

  it('maps transmitted DCTFWeb duplicate guard to GPSDuplicatesDCTFWebError', async () => {
    const db = {
      configured: true,
      transaction: jest.fn(
        async (callback: (client: TestDbClient) => Promise<unknown>) =>
          callback({
            query: jest.fn(async (sql: string) => {
              if (sql.includes('assert_no_dctfweb_for_competence')) {
                throw new Error(
                  'GPS residual duplicates transmitted or accepted DCTFWeb',
                );
              }
              return { rows: [] };
            }),
          }),
      ),
    };
    const service = new GpsService(db as never, new GpsTxtSerializer());

    await expect(
      RequestContextStore.run(
        { tenantId, permissions: ['fiscal.gps.read', 'fiscal.gps.write'] },
        () =>
          service.generateResidualGPS({
            competence: '2026-01-01',
            paymentCodeId,
            reason: 'MALHA_FINA',
            reasonDetail: 'Debito isolado',
          }),
      ),
    ).rejects.toBeInstanceOf(GPSDuplicatesDCTFWebError);
  });

  it('calculates late charges for a valid retroactive competence', () => {
    expect(
      calculateGpsLateCharges({
        competence: '2026-03-01',
        amount: '100.00',
        paidAt: new Date(TEST_INSTANT_2026_04_30T00_00_00_000Z),
      }),
    ).toEqual({
      interestAmount: '0.33',
      fineAmount: '3.30',
      totalAmount: '103.63',
    });
  });
});

function remittanceRow() {
  return {
    id: remittanceId,
    competence: '2026-03-01',
    payment_code_id: paymentCodeId,
    payment_code: '2402',
    payment_code_description: 'Orgaos do poder publico',
    reason: 'RETROACTIVE',
    reason_detail: 'Competencia anterior a adesao eSocial',
    base_amount: '1000.00',
    amount: '110.00',
    interest_amount: '0.37',
    fine_amount: '3.63',
    total_amount: '113.99',
    status: 'GENERATED',
    file_uri: 's3://local-fiscal/gps.txt',
    txt_content: 'GPS|GPS-IN925-2009|\r\nFIMGPS|\r\n',
    txt_hash: 'a'.repeat(64),
    generated_at: '2026-05-02T12:00:00.000Z',
    paid_at: null,
    created_at: '2026-05-02T12:00:00.000Z',
    updated_at: '2026-05-02T12:00:00.000Z',
  };
}
