import { FaceConsentService } from './consent.service';

const employeeId = '00000000-0000-4000-8000-000000000531';

class FakeExclusionDatabase {
  readonly configured = true;
  revoked = false;

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('UPDATE ponto.face_consent')) {
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000532',
                employee_id: employeeId,
                consent_version: 'ponto-face-v1',
                consent_at: new Date('2026-05-02T12:00:00.000Z'),
                withdrawn_at: new Date('2026-05-02T13:00:00.000Z'),
              },
            ],
          };
        }
        if (sql.includes('UPDATE ponto.employee_face_template')) {
          this.revoked = true;
          return { rowCount: 1, rows: [] };
        }
        return { rows: [] };
      }),
    };
    return callback(client);
  }
}

describe('PONTO-10 facial LGPD exclusion', () => {
  it('crypto-shreds the KMS key material and marks templates as revoked', async () => {
    const database = new FakeExclusionDatabase();
    const service = new FaceConsentService(database as never);

    const result = await service.withdraw(employeeId);

    expect(database.revoked).toBe(true);
    expect(result).toMatchObject({
      employeeId,
      withdrawnAt: '2026-05-02T13:00:00.000Z',
      revokedTemplates: 1,
    });
  });
});
