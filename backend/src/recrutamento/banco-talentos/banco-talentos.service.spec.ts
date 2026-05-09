import { BancoTalentosService } from './banco-talentos.service';

const candidateId = '00000000-0000-4000-8000-000000000201';

function candidateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: candidateId,
    cpf: '12345678901',
    full_name: 'Ana Silva',
    birth_date: '1990-01-15',
    email: 'ana@example.com',
    phone: '+5511999999999',
    address: { city: 'Sao Paulo' },
    lgpd_consent_at: '2026-05-03T10:00:00.000Z',
    lgpd_consent_version: 'v1',
    source: 'manual',
    curriculum_s3_key: 'curriculos/ana.pdf',
    profile_summary: 'Analista de folha',
    skills: ['folha', 'rh'],
    pool_status: 'ACTIVE',
    created_at: '2026-05-03T10:00:00.000Z',
    updated_at: '2026-05-03T10:00:00.000Z',
    ...overrides,
  };
}

function database(options: { missing?: boolean; duplicate?: boolean } = {}) {
  const query = jest.fn(
    async (sql: string, values: readonly unknown[] = []) => {
      const compact = sql.replace(/\s+/g, ' ');
      if (compact.includes('count(*)::text AS total')) {
        return [{ total: options.missing ? '0' : '1' }];
      }
      if (compact.includes('INSERT INTO recrutamento.candidato')) {
        if (options.duplicate) {
          const error = new Error('duplicate') as Error & { code: string };
          error.code = '23505';
          throw error;
        }
        return [
          candidateRow({
            cpf: values[0],
            full_name: values[1],
            email: values[3],
            phone: values[4],
            source: values[8],
            curriculum_s3_key: values[9],
            profile_summary: values[10],
            skills: values[11],
          }),
        ];
      }
      if (compact.includes('UPDATE recrutamento.candidato')) {
        if (options.missing) return [];
        return [candidateRow({ pool_status: values[11] ?? 'ACTIVE' })];
      }
      if (compact.includes('FROM recrutamento.candidato')) {
        if (options.missing) return [];
        return [candidateRow()];
      }
      return [];
    },
  );

  return { configured: true, query };
}

describe('BancoTalentosService', () => {
  it('lists active talent-pool candidates with search pagination', async () => {
    const db = database();
    const service = new BancoTalentosService(db as never);

    await expect(
      service.list({ page: 2, pageSize: 5, search: 'Ana' }),
    ).resolves.toMatchObject({
      page: 2,
      pageSize: 5,
      total: 1,
      items: [{ fullName: 'Ana Silva', status: 'ACTIVE' }],
    });
    expect(db.query).toHaveBeenLastCalledWith(
      expect.stringContaining('FROM recrutamento.candidato'),
      ['ACTIVE', '%ana%', 5, 5],
    );
  });

  it('creates a candidate profile and normalizes searchable fields', async () => {
    const db = database();
    const service = new BancoTalentosService(db as never);

    await expect(
      service.create({
        cpf: '12345678901',
        fullName: ' Ana Silva ',
        birthDate: '1990-01-15',
        email: ' ANA@EXAMPLE.COM ',
        phone: ' +5511999999999 ',
        address: { city: 'Sao Paulo' },
        lgpdConsentAt: '2026-05-03T10:00:00.000Z',
        lgpdConsentVersion: ' v1 ',
        source: ' importacao ',
        curriculumS3Key: ' curriculos/ana.pdf ',
        profileSummary: ' Analista de folha ',
        skills: [' folha ', 'rh', 'folha'],
      }),
    ).resolves.toMatchObject({
      cpf: '12345678901',
      fullName: 'Ana Silva',
      email: 'ana@example.com',
      source: 'importacao',
      skills: ['folha', 'rh'],
      profileCompletenessScore: 80,
      rankingScore: 100,
    });
  });

  it('updates, ranks, and archives candidate profiles deterministically', async () => {
    const service = new BancoTalentosService(database() as never);

    await expect(
      service.update(candidateId, {
        email: 'novo@example.com',
        profileSummary: 'Perfil revisado',
        skills: ['gestao'],
      }),
    ).resolves.toMatchObject({
      id: candidateId,
      status: 'ACTIVE',
      profileCompletenessScore: 80,
      rankingScore: 100,
    });
    await expect(service.archive(candidateId)).resolves.toMatchObject({
      id: candidateId,
      status: 'ARCHIVED',
    });
  });

  it('guards duplicate CPF, missing rows, and missing database configuration', async () => {
    await expect(
      new BancoTalentosService({ configured: false } as never).list({}),
    ).rejects.toThrow('DATABASE_URL is required');
    await expect(
      new BancoTalentosService(database({ duplicate: true }) as never).create({
        cpf: '12345678901',
        fullName: 'Ana Silva',
        birthDate: '1990-01-15',
        email: 'ana@example.com',
        phone: '+5511999999999',
        lgpdConsentAt: '2026-05-03T10:00:00.000Z',
        lgpdConsentVersion: 'v1',
      }),
    ).rejects.toThrow('CPF already exists');
    await expect(
      new BancoTalentosService(database({ missing: true }) as never).findById(
        candidateId,
      ),
    ).rejects.toThrow('Talent pool candidate not found');
  });
});
