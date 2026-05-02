import { PreconditionFailedException } from '@nestjs/common';

import { RequestContextStore } from '../../backend/src/common/request-context/request-context.store';
import { DctfwebBuilderService } from '../../backend/src/integrations-worker/dctfweb/dctfweb-builder.service';
import { DctfwebSignerService } from '../../backend/src/integrations-worker/dctfweb/dctfweb-signer.service';

const tenantId = '00000000-0000-0000-0000-00000000f501';
const declarationId = '00000000-0000-4000-8000-00000000f501';

interface TestDbClient {
  query(sql: string, values: unknown[]): Promise<{ rows: unknown[] }>;
}

describe('DCTFWeb flow (e2e)', () => {
  it('matches DCTFWeb item totals to accepted S-5011/S-5012/S-5013 totalizers', async () => {
    const inserted: Array<{ baseAmount: string; amount: string }> = [];
    const db = {
      configured: true,
      query: jest
        .fn()
        .mockResolvedValueOnce([
          totalizer('S-5011', 'REC-S1299', [
            debit('00000000-0000-4000-8000-000000005011', '1082-01', '1000.00', '200.00'),
          ]),
          totalizer('S-5012', 'REC-S1299', [
            debit('00000000-0000-4000-8000-000000005012', '0561', '500.00', '50.00'),
          ]),
          totalizer('S-5013', 'REC-S1299', [
            debit('00000000-0000-4000-8000-000000005013', 'FGTS', '800.00', '64.00'),
          ]),
        ])
        .mockResolvedValueOnce([declarationRow('314.00')])
        .mockResolvedValueOnce([
          itemRow('S5011', '1082-01', '1000.00', '200.00'),
          itemRow('S5012', '0561', '500.00', '50.00'),
          itemRow('S5013', 'FGTS', '800.00', '64.00'),
        ]),
      transaction: jest.fn(async (callback: (client: TestDbClient) => Promise<unknown>) =>
        callback({
          query: jest.fn(async (sql: string, values: unknown[]) => {
            if (sql.includes('INSERT INTO fiscal.dctfweb_declaration')) {
              return { rows: [{ id: declarationId }] };
            }
            if (sql.includes('INSERT INTO fiscal.dctfweb_item')) {
              inserted.push({
                baseAmount: String(values[5]),
                amount: String(values[6]),
              });
            }
            return { rows: [] };
          }),
        }),
      ),
    };
    const service = new DctfwebBuilderService(db as never);

    const result = await RequestContextStore.run(
      {
        tenantId,
        permissions: ['fiscal.dctfweb.read', 'fiscal.dctfweb.write'],
      },
      () => service.generate({ year: 2026, month: 1 }),
    );

    const totalizersAmount = ['200.00', '50.00', '64.00'].reduce(
      (sum, value) => sum + Number(value),
      0,
    );
    const itemAmount = inserted.reduce((sum, item) => sum + Number(item.amount), 0);
    expect(itemAmount).toBe(totalizersAmount);
    expect(result.totalAmount).toBe('314.00');
  });

  it('returns 412 when no ICP-Brasil certificate is configured', async () => {
    const signer = new DctfwebSignerService(
      { configured: true } as never,
      {
        find: jest.fn(async () => ({ ...signedCandidate(), status: 'DRAFT' })),
      } as never,
      {
        activeCertificate: jest.fn(async () => {
          throw new Error(
            'No active non-expired eSocial certificate is available for current tenant',
          );
        }),
      } as never,
      { readPkcs12: jest.fn() } as never,
    );

    await expect(signer.sign(declarationId)).rejects.toBeInstanceOf(PreconditionFailedException);
  });
});

function totalizer(kind: string, receipt: string, items: unknown[]) {
  return {
    kind,
    source_event_recibo: receipt,
    payload: { items },
  };
}

function debit(sourceRunId: string, debitCode: string, baseAmount: string, amount: string) {
  return { sourceRunId, debitCode, baseAmount, amount };
}

function declarationRow(totalAmount: string) {
  return {
    id: declarationId,
    competence: '2026-01-01',
    kind: 'ORIGINAL',
    status: 'DRAFT',
    original_declaration_id: null,
    payload_xml_ref: 's3://payload.xml',
    payload_xml: '<DCTFWeb />',
    payload_xml_hash: 'a'.repeat(64),
    signed_xml_ref: null,
    signed_xml: null,
    signed_xml_hash: null,
    transmitted_xml_hash: null,
    receipt_number: null,
    receipt_at: null,
    item_count: 3,
    total_base_amount: '2300.00',
    total_amount: totalAmount,
    created_at: '2026-05-02T12:00:00.000Z',
    updated_at: '2026-05-02T12:00:00.000Z',
  };
}

function itemRow(sourceEvent: string, debitCode: string, baseAmount: string, amount: string) {
  return {
    id: `00000000-0000-4000-8000-${debitCode.padEnd(12, '0').slice(0, 12)}`,
    source_event: sourceEvent,
    source_run_id: '00000000-0000-4000-8000-000000005011',
    debit_code: debitCode,
    base_amount: baseAmount,
    amount,
  };
}

function signedCandidate() {
  return {
    id: declarationId,
    payloadXml: '<DCTFWeb><declaracao Id="DCTF1" /></DCTFWeb>',
  };
}
