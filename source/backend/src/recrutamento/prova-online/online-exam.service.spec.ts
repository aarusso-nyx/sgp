import { ForbiddenException } from '@nestjs/common';

import { BiometricMatcherService } from '../biometria/biometric-matcher.service';
import { OnlineExamService } from './online-exam.service';

const applicationId = '00000000-0000-4000-8000-000000000801';
const provaId = '00000000-0000-4000-8000-000000000802';
const candidatoId = '00000000-0000-4000-8000-000000000803';
const concursoId = '00000000-0000-4000-8000-000000000804';

class FakeOnlineExamDatabase {
  readonly configured = true;
  auditReasons: string[] = [];
  sessionStarted = false;

  async query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    if (sql.includes('sgp_append_audit_event')) {
      this.auditReasons.push(String(values[1]));
    }
    return [] as T[];
  }

  async transaction<T>(
    callback: (client: { query: jest.Mock }) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM recrutamento.inscricao')) {
          return {
            rows: [
              {
                tenant_id: '00000000-0000-4000-8000-000000000001',
                concurso_id: concursoId,
                candidato_id: candidatoId,
              },
            ],
          };
        }
        if (sql.includes('FROM recrutamento.prova')) {
          return { rows: [{ ok: 1 }] };
        }
        if (sql.includes('INSERT INTO recrutamento.online_exam_session')) {
          this.sessionStarted = true;
          return {
            rows: [
              {
                id: '00000000-0000-4000-8000-000000000805',
                application_id: applicationId,
                prova_id: provaId,
                started_at: new Date('2026-05-02T12:00:00.000Z'),
                ended_at: null,
                status: 'IN_PROGRESS',
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

describe('OnlineExamService', () => {
  it('blocks start without camera and writes a rejection audit event', async () => {
    const database = new FakeOnlineExamDatabase();
    const service = new OnlineExamService(
      database as never,
      { matchWithClient: jest.fn() } as never,
    );

    await expect(
      service.start({
        ...startPayload(),
        mediaConstraints: {
          camera: false,
          microphone: true,
          screenShare: true,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(database.auditReasons).toContain('media_denied');
    expect(database.sessionStarted).toBe(false);
  });

  it('requires positive biometric verification before creating the session', async () => {
    const database = new FakeOnlineExamDatabase();
    const matcher: Pick<BiometricMatcherService, 'matchWithClient'> = {
      matchWithClient: jest.fn(async () => ({
        matched: true,
        score: '0.920000',
        threshold: '0.700000',
        decision: 'ACCEPT',
      })),
    };
    const service = new OnlineExamService(database as never, matcher as never);

    const session = await service.start(startPayload());

    expect(matcher.matchWithClient).toHaveBeenCalled();
    expect(session.status).toBe('IN_PROGRESS');
    expect(database.sessionStarted).toBe(true);
  });
});

function startPayload() {
  return {
    applicationId,
    provaId,
    candidatoId,
    recordingConsentAccepted: true,
    mediaConstraints: {
      camera: true,
      microphone: true,
      screenShare: true,
    },
    biometricSampleBase64: Buffer.from('candidate-face').toString('base64'),
    biometricKind: 'FACE' as const,
    browserFingerprint: 'browser-fp',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  };
}
