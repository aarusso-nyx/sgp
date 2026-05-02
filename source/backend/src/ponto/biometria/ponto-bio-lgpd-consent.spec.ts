import { PontoBiometricMatcherService } from './biometric-matcher.service';

describe('PONTO-08 LGPD consent', () => {
  it('keeps the primary time record path valid and skips biometric_match without active consent', async () => {
    const client = { query: jest.fn() };
    const service = new PontoBiometricMatcherService(
      { configured: true } as never,
      {
        hasActiveConsent: jest.fn().mockResolvedValue(false),
      } as never,
    );

    const result = await service.matchDuringIngestion(client as never, {
      employeeId: '00000000-0000-4000-8000-000000000101',
      timeRecordId: '00000000-0000-4000-8000-000000000201',
      kind: 'FINGERPRINT',
      sampleBase64: Buffer.alloc(4096, 3).toString('base64'),
      deviceId: '00000000-0000-4000-8000-000000000060',
    });

    expect(result).toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });
});
