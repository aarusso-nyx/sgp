import { BadRequestException } from '@nestjs/common';

import { EpiSignatureMethod } from './epi.dto';
import { EpiDeliveryService } from './epi-delivery.service';

describe('EpiDeliveryService', () => {
  it.each([
    [EpiSignatureMethod.FISICA, undefined],
    [EpiSignatureMethod.DIGITAL, 's3://sgp/epi/signature.pdf'],
    [EpiSignatureMethod.GOVBR, 'govbr://evidences/123'],
  ])(
    'registers signed %s EPI delivery',
    async (signatureMethod, evidenceUri) => {
      const database = databaseStub([
        [
          {
            id: 'delivery-1',
            employee_id: 'employee-1',
            employee_name: null,
            epi_inventory_id: 'epi-1',
            ca_number: null,
            epi_name: null,
            delivered_at: '2026-05-02T00:00:00.000Z',
            quantity: 1,
            signature_method: signatureMethod,
            signature_evidence_uri: evidenceUri ?? null,
            training_done_at: '2026-05-02',
          },
        ],
      ]);
      const service = new EpiDeliveryService(database as never);

      const result = await service.register({
        employeeId: 'employee-1',
        epiInventoryId: 'epi-1',
        deliveredAt: '2026-05-02T00:00:00.000Z',
        quantity: 1,
        signatureMethod,
        signatureEvidenceUri: evidenceUri,
        trainingDoneAt: '2026-05-02',
      });

      expect(result.signatureMethod).toBe(signatureMethod);
      expect(database.sql()).toContain('INSERT INTO saude.epi_delivery');
    },
  );

  it('rejects GovBR delivery without signature evidence', async () => {
    const service = new EpiDeliveryService(databaseStub([]) as never);

    await expect(
      service.register({
        employeeId: 'employee-1',
        epiInventoryId: 'epi-1',
        deliveredAt: '2026-05-02T00:00:00.000Z',
        quantity: 1,
        signatureMethod: EpiSignatureMethod.GOVBR,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function databaseStub(results: unknown[][]) {
  const sql: string[] = [];
  let index = 0;
  return {
    configured: true,
    query: jest.fn(async (statement: string) => {
      sql.push(statement);
      return results[index++] ?? [];
    }),
    sql: () => sql.join('\n'),
  };
}
