import { ForbiddenException } from '@nestjs/common';

import { BiometricCaptureService } from './biometric-capture.service';
import { BiometricConsentService } from './consent.service';
import {
  decryptTemplate,
  extractBiometricTemplate,
} from './biometric-template';
import { TEST_INSTANT_2026_05_02T12_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

const candidatoId = '00000000-0000-4000-8000-000000000701';

class FakeCaptureDatabase {
  readonly configured = true;
  capturedCipher?: Buffer;
  capturedKmsKeyId?: string;

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: jest.fn(async (sql: string, values: unknown[] = []) => {
        if (sql.includes('INSERT INTO recrutamento.candidate_biometric')) {
          this.capturedCipher = values[2] as Buffer;
          this.capturedKmsKeyId = String(values[3]);
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000702',
                quality_score: values[4],
                captured_at: new Date(TEST_INSTANT_2026_05_02T12_00_00_000Z),
                retention_until: values[6],
              },
            ],
          };
        }
        return { rows: [{ '?column?': 1 }] };
      }),
    };
    return callback(client);
  }
}

describe('BiometricCaptureService', () => {
  it('persists an encrypted template and requires the valid KMS key id for decryption', async () => {
    const database = new FakeCaptureDatabase();
    const consentService = {
      assertActiveConsent: jest.fn(async () => undefined),
    } as unknown as BiometricConsentService;
    const service = new BiometricCaptureService(
      database as never,
      consentService,
    );
    const sampleBase64 = Buffer.from('fingerprint-reader-sample').toString(
      'base64',
    );

    await service.capture({
      candidatoId,
      kind: 'FINGERPRINT',
      sampleBase64,
      captureDeviceRef: 'reader-a',
      retentionUntil: '2026-08-31T00:00:00.000Z',
      templateKmsKeyId: 'kms/rec-07/a',
    });

    const plain = extractBiometricTemplate(
      'FINGERPRINT',
      sampleBase64,
    ).template;
    expect(database.capturedCipher).toBeInstanceOf(Buffer);
    expect(database.capturedCipher?.equals(plain)).toBe(false);
    expect(
      decryptTemplate(database.capturedCipher!, 'kms/rec-07/a').equals(plain),
    ).toBe(true);
    expect(
      decryptTemplate(database.capturedCipher!, 'kms/rec-07/b').equals(plain),
    ).toBe(false);
  });

  it('rejects capture without active highlighted consent', async () => {
    const database = new FakeCaptureDatabase();
    const consentService = {
      assertActiveConsent: jest.fn(async () => {
        throw new ForbiddenException('Active biometric consent is required');
      }),
    } as unknown as BiometricConsentService;
    const service = new BiometricCaptureService(
      database as never,
      consentService,
    );

    await expect(
      service.capture({
        candidatoId,
        kind: 'FACE',
        sampleBase64: Buffer.from('camera-face-sample').toString('base64'),
        captureDeviceRef: 'camera-a',
        retentionUntil: '2026-08-31T00:00:00.000Z',
        templateKmsKeyId: 'kms/rec-07/a',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
