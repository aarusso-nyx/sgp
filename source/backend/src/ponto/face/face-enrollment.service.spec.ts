import { FaceConsentService } from './consent.service';
import { FaceEnrollmentService } from './face-enrollment.service';
import {
  decryptFaceEmbedding,
  extractLocalFaceEmbedding,
} from './face-template';
import { FaceLivenessService } from './liveness.service';
import { FaceThresholdAdminService } from './threshold-admin.service';

const employeeId = '00000000-0000-4000-8000-000000000501';

class FakeEnrollmentDatabase {
  readonly configured = true;
  capturedCipher?: Buffer;
  capturedKmsKeyId?: string;
  capturedModelId?: string;
  capturedModelVersion?: string;

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: jest.fn(async (sql: string, values: unknown[] = []) => {
        if (sql.includes('INSERT INTO ponto.employee_face_template')) {
          this.capturedCipher = values[1] as Buffer;
          this.capturedKmsKeyId = String(values[2]);
          this.capturedModelId = String(values[3]);
          this.capturedModelVersion = String(values[4]);
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000502',
                employee_id: values[0],
                model_id: values[3],
                model_version: values[4],
                captured_at: new Date('2026-05-02T12:00:00.000Z'),
                status: 'ACTIVE',
                encrypted_differs: true,
              },
            ],
          };
        }
        return { rows: [{ threshold: '0.700000', liveness_required: true }] };
      }),
    };
    return callback(client);
  }
}

describe('FaceEnrollmentService', () => {
  it('persists encrypted embedding and records model identity/version', async () => {
    const database = new FakeEnrollmentDatabase();
    const consentService = {
      assertActiveConsent: jest.fn(async () => undefined),
    } as unknown as FaceConsentService;
    const thresholdService = {
      getCurrent: jest.fn(async () => ({
        threshold: '0.700000',
        livenessRequired: true,
      })),
    } as unknown as FaceThresholdAdminService;
    const service = new FaceEnrollmentService(
      database as never,
      consentService,
      new FaceLivenessService(),
      thresholdService,
    );
    const imageBase64 = Buffer.from('face-sample-open-camera').toString(
      'base64',
    );

    const result = await service.enroll({
      employeeId,
      templateKmsKeyId: 'kms/ponto/face/a',
      frames: [
        { imageBase64, blinkDetected: false, yawDegrees: -10 },
        { imageBase64, blinkDetected: true, yawDegrees: 10 },
      ],
    });

    const plain = extractLocalFaceEmbedding(imageBase64).embedding;
    expect(result.modelId).toBe('local-insightface-facenet');
    expect(result.modelVersion).toBe('open-source-local-v1');
    expect(database.capturedCipher).toBeInstanceOf(Buffer);
    expect(database.capturedCipher?.equals(plain)).toBe(false);
    expect(
      decryptFaceEmbedding(database.capturedCipher!, 'kms/ponto/face/a').equals(
        plain,
      ),
    ).toBe(true);
  });
});
