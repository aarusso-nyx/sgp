import { PontoBiometricMatcherService } from './biometric-matcher.service';
import {
  encryptPontoTemplate,
  extractPontoBiometricTemplate,
} from './biometric-template';

describe('PontoBiometricMatcherService', () => {
  const employeeId = '00000000-0000-4000-8000-000000000101';
  const timeRecordIds = [
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000203',
  ];
  const sampleBase64 = Buffer.alloc(4096, 9).toString('base64');
  const kmsKeyId = 'kms/ponto/fingerprint';
  const template = extractPontoBiometricTemplate('FINGERPRINT', sampleBase64);
  const cipher = encryptPontoTemplate(template.template, kmsKeyId);

  it('records three same-day matches with scores at or above 0.85', async () => {
    const inserts: unknown[][] = [];
    const client = {
      query: jest.fn((sql: string, values: unknown[]) => {
        if (sql.includes('FROM ponto.biometric_consent')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (sql.includes('FROM ponto.employee_biometric_template')) {
          return Promise.resolve({
            rows: [{ template_cipher: cipher, template_kms_key_id: kmsKeyId }],
          });
        }
        if (sql.includes('INSERT INTO ponto.biometric_match')) {
          inserts.push(values);
          return Promise.resolve({
            rows: [
              { id: `00000000-0000-4000-8000-00000000030${inserts.length}` },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    const service = new PontoBiometricMatcherService(
      { configured: true } as never,
      {
        hasActiveConsent: jest.fn().mockResolvedValue(true),
      } as never,
    );

    const results = [];
    for (const timeRecordId of timeRecordIds) {
      results.push(
        await service.matchDuringIngestion(client as never, {
          employeeId,
          timeRecordId,
          kind: 'FINGERPRINT',
          sampleBase64,
          deviceId: '00000000-0000-4000-8000-000000000060',
          threshold: 0.85,
        }),
      );
    }

    expect(results).toHaveLength(3);
    expect(results.every((result) => result?.matched)).toBe(true);
    expect(results.every((result) => Number(result?.score) >= 0.85)).toBe(true);
    expect(inserts).toHaveLength(3);
  });
});
