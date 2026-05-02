import { AiFlagsService } from './ai-flags.service';

class FakeAiDatabase {
  readonly configured = true;
  insertedKind?: string;

  async query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    if (sql.includes('INSERT INTO recrutamento.proctoring_event')) {
      this.insertedKind = String(values[1]);
      return [
        {
          id: '00000000-0000-4000-8000-000000000811',
          kind: values[1],
          severity: values[2],
          ai_score: values[4],
        },
      ] as T[];
    }
    return [] as T[];
  }
}

describe('AiFlagsService', () => {
  it('creates VOICE_MISMATCH for a local transcript with third-party voice evidence', async () => {
    const database = new FakeAiDatabase();
    const service = new AiFlagsService(database as never);

    const result = await service.analyzeAudio({
      sessionId: '00000000-0000-4000-8000-000000000812',
      transcript: '[OTHER_VOICE] resposta falada por terceiro',
      evidenceRef: 's3://tenant/proctoring/audio-01.txt',
    });

    expect(result?.kind).toBe('VOICE_MISMATCH');
    expect(result?.severity).toBe('SEVERE');
    expect(database.insertedKind).toBe('VOICE_MISMATCH');
  });
});
