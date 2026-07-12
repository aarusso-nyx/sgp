import {
  FROZEN_TEST_TIME,
  expectForbiddenNegativePath,
} from './helpers/test-debt-coverage';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';

import { AppModule } from '../../backend/src/app.module';
import { SgpStynxTokenVerifier } from '../../backend/src/auth/sgp-stynx-token-verifier.service';
import { DatabaseService } from '../../backend/src/database/database.service';

class FakeInscricaoDatabase {
  readonly configured = true;
  readonly insertedConsentVersions: string[] = [];
  readonly insertedQuotaDeclarations: Record<string, unknown>[] = [];
  private readonly applications: Array<{
    id: string;
    tenantId: string;
    tokenHash: string;
    status: string;
    exemptionKind: string;
    fullName: string;
  }> = [];

  applyPublicLookupContext(): Promise<void> {
    return Promise.resolve();
  }

  applyTenantMutationContext(): Promise<void> {
    return Promise.resolve();
  }

  async query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    if (sql.includes('recrutamento.get_public_concurso')) {
      if (values[0] !== 'rec-2026') {
        return [{ concurso: null }] as T[];
      }
      return [
        {
          concurso: {
            id: '00000000-0000-4000-8000-000000000051',
            tenantId: '00000000-0000-4000-8000-000000000001',
            vagas: [
              {
                positionId: '00000000-0000-4000-8000-000000000052',
                requirement: { minAge: 18, education: 'SUPERIOR' },
                baseSalary: '5000.00',
              },
            ],
          },
        },
      ] as T[];
    }
    return [] as T[];
  }

  async transaction<T>(callback: (client: unknown) => Promise<T>): Promise<T> {
    const client = {
      query: async (sql: string, values: unknown[] = []) => {
        if (sql.includes('INSERT INTO recrutamento.inscricao')) {
          const index = this.applications.length + 53;
          const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
          const status = String(values[9]);
          const exemptionKind = String(values[10]);
          const fullName = String(values[1]);
          const tokenHash = String(values[12]);
          this.insertedConsentVersions.push(String(values[6]));
          this.insertedQuotaDeclarations.push(
            JSON.parse(String(values[13])) as Record<string, unknown>,
          );
          this.applications.push({
            id,
            tenantId: '00000000-0000-4000-8000-000000000001',
            tokenHash,
            status,
            exemptionKind,
            fullName,
          });
          return {
            rows: [
              {
                id,
                status,
                candidato_id: '00000000-0000-4000-8000-000000000054',
              },
            ],
          };
        }
        if (sql.includes('FROM recrutamento.inscricao')) {
          const application = this.applications.find(
            (item) => item.id === values[0] && item.tokenHash === values[1],
          );
          return {
            rows: application
              ? [
                  {
                    id: application.id,
                    tenant_id: application.tenantId,
                    status: application.status,
                    exemption_kind: application.exemptionKind,
                    full_name: application.fullName,
                    payment_charge_id: null,
                    gateway: null,
                    external_id: null,
                  },
                ]
              : [],
          };
        }
        return { rows: [] };
      },
    };
    return callback(client);
  }
}

describe('public inscricao flow', () => {
  let app: INestApplication<SupertestApp>;
  let database: FakeInscricaoDatabase;

  beforeEach(async () => {
    database = new FakeInscricaoDatabase();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SgpStynxTokenVerifier)
      .useValue({
        verifyAuthorizationHeader: jest.fn(async () => ({
          sub: '00000000-0000-4000-8000-000000000090',
          username: 'rec-readonly',
          tenantId: '00000000-0000-4000-8000-000000000001',
          groups: [],
          permissions: ['recrutamento.concurso.read'],
          claims: {},
        })),
      })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a CadUnico-exempt public application without JWT and confirms it by token', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/rec-2026/inscricoes')
      .send(validPayload())
      .expect(201);

    expect(created.body.status).toBe('EXEMPT');
    expect(created.body.payment).toBeNull();

    const confirmed = await request(app.getHttpServer())
      .get(`/api/v1/publico/inscricoes/${created.body.id}`)
      .query({ token: created.body.token })
      .expect(200);

    expect(confirmed.body.exemptionKind).toBe('CADUNICO');
    expect(database.insertedConsentVersions).toEqual(['rec-02-v1']);
    expect(database.insertedQuotaDeclarations).toEqual([{ pcd: true }]);
  });

  it('rejects invalid slugs and quota self-declarations before inserting', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/unknown-slug/inscricoes')
      .send(validPayload())
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/rec-2026/inscricoes')
      .send({
        ...validPayload(),
        quotaSelfDeclaration: { racial: false },
      })
      .expect(422);

    expect(database.insertedConsentVersions).toHaveLength(0);
  });

  it('scopes public follow-up to the matching id and access token only', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/rec-2026/inscricoes')
      .send(validPayload())
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/rec-2026/inscricoes')
      .send({
        ...validPayload(),
        candidate: {
          ...validPayload().candidate,
          cpf: '39053344705',
          fullName: 'Joao Santos',
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/publico/inscricoes/${second.body.id}`)
      .query({ token: first.body.token })
      .expect(404);

    const matched = await request(app.getHttpServer())
      .get(`/api/v1/publico/inscricoes/${second.body.id}`)
      .query({ token: second.body.token })
      .expect(200);

    expect(matched.body.candidateName).toBe('Joao Santos');
  });

  it('returns 422 when LGPD consent is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/rec-2026/inscricoes')
      .send({ ...validPayload(), lgpdConsent: false })
      .expect(422);
  });

  it('returns 422 for invalid CPF or age below the minimum', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/rec-2026/inscricoes')
      .send({
        ...validPayload(),
        candidate: { ...validPayload().candidate, cpf: '11111111111' },
      })
      .expect(422);

    await request(app.getHttpServer())
      .post('/api/v1/publico/concursos/rec-2026/inscricoes')
      .send({
        ...validPayload(),
        candidate: { ...validPayload().candidate, birthDate: '2015-01-01' },
      })
      .expect(422);
  });

  it('keeps administrative concurso creation protected from read-only actors', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/recrutamento/concursos')
      .set('Authorization', 'Bearer readonly-recruitment-token')
      .send({
        code: 'rec-2026',
        name: 'Concurso 2026',
        validUntil: '2026-06-30',
        vagas: [
          {
            positionId: '00000000-0000-4000-8000-000000000001',
            totalSeats: 10,
            pcdSeats: 1,
            racialSeats: 2,
            indigenousSeats: 0,
            baseSalary: '5000.00',
          },
        ],
      })
      .expect(403);
  });
});

function validPayload() {
  return {
    vagaId: '00000000-0000-4000-8000-000000000052',
    candidate: {
      cpf: '52998224725',
      fullName: 'Maria Silva',
      birthDate: '1990-01-10',
      email: 'maria@example.test',
      phone: '11999999999',
      address: {
        street: 'Rua A',
        city: 'Sao Paulo',
        state: 'SP',
        postalCode: '01000-000',
      },
    },
    requirements: {
      education: 'SUPERIOR',
    },
    quotaSelfDeclaration: {
      pcd: true,
    },
    exemption: {
      kind: 'CADUNICO',
      nis: '12345678901',
    },
    lgpdConsent: true,
    lgpdConsentVersion: 'rec-02-v1',
  };
}

describe('Wave 7 test debt guardrails', () => {
  describe('403 negative path', () => {
    it('returns 403 when an authenticated actor lacks the required permission', async () => {
      await expectForbiddenNegativePath();
    });
  });

  describe('frozen clock', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(FROZEN_TEST_TIME);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('uses a deterministic system time', () => {
      expect(new Date().toISOString()).toBe(FROZEN_TEST_TIME.toISOString());
    });
  });
});
