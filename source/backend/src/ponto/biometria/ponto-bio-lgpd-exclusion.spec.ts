import { PontoBiometricMatcherService } from './biometric-matcher.service';

describe('PONTO-08 LGPD exclusion', () => {
  it('returns false and audits when matching after revoked template crypto-shredding', async () => {
    const client = {
      query: jest.fn((sql: string) => {
        if (sql.includes('sgp_append_audit_event'))
          return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      }),
    };
    const database = {
      configured: true,
      transaction: (callback: (tx: unknown) => Promise<unknown>) =>
        callback(client),
    };
    const service = new PontoBiometricMatcherService(
      database as never,
      {
        hasActiveConsent: jest.fn().mockResolvedValue(false),
      } as never,
    );

    const result = await service.match({
      employeeId: '00000000-0000-4000-8000-000000000101',
      kind: 'FINGERPRINT',
      sampleBase64: Buffer.alloc(4096, 4).toString('base64'),
      threshold: 0.85,
    });

    expect(result.matched).toBe(false);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('sgp_append_audit_event'),
      ['00000000-0000-4000-8000-000000000101', 'FINGERPRINT'],
    );
  });
});
