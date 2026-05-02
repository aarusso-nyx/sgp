import { TimeRecordHashService } from '../time-record/time-record-hash.service';
import { FaceConsentService } from './consent.service';
import { FaceMatcherService } from './face-matcher.service';
import {
  encryptFaceEmbedding,
  extractLocalFaceEmbedding,
} from './face-template';
import { FaceLivenessService } from './liveness.service';
import { FaceThresholdAdminService } from './threshold-admin.service';

const employeeId = '00000000-0000-4000-8000-000000000511';

class FakeMatcherDatabase {
  readonly configured = true;
  private readonly storedCipher: Buffer;
  attempts: Array<{
    decision: string;
    score: string;
    livenessPassed: boolean;
  }> = [];

  constructor(sampleBase64: string) {
    this.storedCipher = encryptFaceEmbedding(
      extractLocalFaceEmbedding(sampleBase64).embedding,
      'kms/ponto/face/a',
    );
  }

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: jest.fn(async (sql: string, values: unknown[] = []) => {
        if (sql.includes('INSERT INTO ponto.face_threshold_config')) {
          return { rows: [{ threshold: '0.700000', liveness_required: true }] };
        }
        if (sql.includes('FROM ponto.employee_face_template')) {
          return {
            rows: [
              {
                embedding_cipher: this.storedCipher,
                embedding_kms_key_id: 'kms/ponto/face/a',
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO ponto.face_match')) {
          this.attempts.push({
            score: String(values[2]),
            livenessPassed: Boolean(values[4]),
            decision: String(values[5]),
          });
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000512',
                decision: values[5],
                time_record_id: values[0] ?? null,
              },
            ],
          };
        }
        return { rows: [] };
      }),
    };
    return callback(client);
  }
}

describe('FaceMatcherService', () => {
  it('accepts a positive match above tenant threshold', async () => {
    const sampleBase64 = Buffer.from('face-sample-positive').toString('base64');
    const database = new FakeMatcherDatabase(sampleBase64);
    const service = serviceFor(database);

    const result = await service.match({
      employeeId,
      frames: [
        { imageBase64: sampleBase64, blinkDetected: false, yawDegrees: -10 },
        { imageBase64: sampleBase64, blinkDetected: true, yawDegrees: 10 },
      ],
    });

    expect(result.decision).toBe('ACCEPT');
    expect(Number(result.score)).toBeGreaterThanOrEqual(0.7);
  });

  it('rejects a negative match below tenant threshold', async () => {
    const storedBase64 = Buffer.from('face-sample-positive').toString('base64');
    const probeBase64 = Buffer.from('different-employee-face').toString(
      'base64',
    );
    const database = new FakeMatcherDatabase(storedBase64);
    const service = serviceFor(database);

    const result = await service.match({
      employeeId,
      frames: [
        { imageBase64: probeBase64, blinkDetected: false, yawDegrees: -10 },
        { imageBase64: probeBase64, blinkDetected: true, yawDegrees: 10 },
      ],
    });

    expect(result.decision).toBe('REJECT');
    expect(Number(result.score)).toBeLessThan(0.7);
  });
});

function serviceFor(database: FakeMatcherDatabase): FaceMatcherService {
  const consentService = {
    hasActiveConsent: jest.fn(async () => true),
    assertActiveConsent: jest.fn(async () => undefined),
  } as unknown as FaceConsentService;
  const thresholdService = {
    getCurrent: jest.fn(async () => ({
      threshold: '0.700000',
      livenessRequired: true,
    })),
  } as unknown as FaceThresholdAdminService;
  const timeRecordHashService = {
    createWithClient: jest.fn(),
  } as unknown as TimeRecordHashService;
  return new FaceMatcherService(
    database as never,
    consentService,
    new FaceLivenessService(),
    thresholdService,
    timeRecordHashService,
  );
}
