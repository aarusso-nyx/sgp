import { BiometricMatcherService } from './biometric-matcher.service';
import {
  encryptTemplate,
  extractBiometricTemplate,
} from './biometric-template';

const candidatoId = '00000000-0000-4000-8000-000000000711';

class FakeMatcherDatabase {
  readonly configured = true;
  private readonly storedCipher: Buffer;
  attempts: Array<{ matched: boolean; score: string }> = [];
  fraudEvents = 0;

  constructor(sampleBase64: string) {
    this.storedCipher = encryptTemplate(
      extractBiometricTemplate('FACE', sampleBase64).template,
      'kms/rec-07/a',
    );
  }

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: jest.fn(async (sql: string, values: unknown[] = []) => {
        if (sql.includes('FROM recrutamento.candidate_biometric')) {
          return {
            rows: [
              {
                template_cipher: this.storedCipher,
                template_kms_key_id: 'kms/rec-07/a',
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO recrutamento.biometric_match_attempt')) {
          this.attempts.push({
            matched: Boolean(values[2]),
            score: String(values[3]),
          });
          return { rows: [] };
        }
        if (sql.includes('SELECT count(*)::text')) {
          const recentFailures = this.attempts
            .slice(-5)
            .filter((attempt) => !attempt.matched).length;
          return { rows: [{ count: String(recentFailures) }] };
        }
        if (sql.includes('recrutamento.biometric.fraud_suspect')) {
          this.fraudEvents += 1;
          return { rows: [{ sgp_append_audit_event: 'event-id' }] };
        }
        return { rows: [] };
      }),
    };
    return callback(client);
  }
}

describe('BiometricMatcherService', () => {
  it('accepts a positive same-candidate face match', async () => {
    const sample = Buffer.from('face-sample-candidate-a').toString('base64');
    const database = new FakeMatcherDatabase(sample);
    const service = new BiometricMatcherService(database as never);

    const result = await service.match({
      candidatoId,
      kind: 'FACE',
      sampleBase64: sample,
      threshold: '0.7',
    });

    expect(result.decision).toBe('ACCEPT');
    expect(result.matched).toBe(true);
  });

  it('rejects five wrong candidates and emits the fraud suspect audit event', async () => {
    const sample = Buffer.from('face-sample-candidate-a').toString('base64');
    const database = new FakeMatcherDatabase(sample);
    const service = new BiometricMatcherService(database as never);

    for (let index = 0; index < 5; index += 1) {
      const result = await service.match({
        candidatoId,
        kind: 'FACE',
        sampleBase64: Buffer.from(`wrong-candidate-${index}`).toString(
          'base64',
        ),
        threshold: '0.98',
      });
      expect(result.decision).toBe('REJECT');
    }

    expect(database.fraudEvents).toBeGreaterThanOrEqual(1);
  });
});
