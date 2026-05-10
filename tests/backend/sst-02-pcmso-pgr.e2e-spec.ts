import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';

import { AppModule } from '../../backend/src/app.module';
import { DatabaseService } from '../../backend/src/database/database.service';
import { CipaCommitteeService } from '../../backend/src/saude/program/cipa-committee.service';
import { HealthProgramService } from '../../backend/src/saude/program/health-program.service';
import { RiskManagementProgramService } from '../../backend/src/saude/program/risk-management-program.service';

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function token(): string {
  const payload = {
    sub: 'sst02-user',
    'cognito:username': 'sst02.user',
    'cognito:groups': ['RH'],
    'custom:tenant_id': '00000000-0000-0000-0000-000000000100',
    exp: Math.floor(Date.now() / 1000) + 3600,
    token_use: 'access',
  };
  return `${encodePart({ alg: 'none', typ: 'JWT' })}.${encodePart(payload)}.`;
}

class FakeDatabaseService {
  readonly configured = true;

  query<T>(sql: string): Promise<T[]> {
    if (sql.includes('SELECT DISTINCT p.key')) {
      return Promise.resolve(
        ['auth.read', 'saude.program.read', 'saude.program.write'].map(
          (key) => ({
            key,
          }),
        ) as T[],
      );
    }
    return Promise.resolve([] as T[]);
  }
}

describe('SST-02 PCMSO/PGR flow (e2e)', () => {
  let app: INestApplication;
  const pcmso = {
    id: '00000000-0000-4000-8000-000000067001',
    workLocationId: '00000000-0000-4000-8000-000000067101',
    workLocationName: 'Sede',
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    responsibleDoctorCrm: 'CRM-1',
    responsibleDoctorName: 'Dra PCMSO',
    status: 'DRAFT',
  };
  const pgr = {
    id: '00000000-0000-4000-8000-000000067002',
    workLocationId: pcmso.workLocationId,
    workLocationName: 'Sede',
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    responsibleEngineerId: null,
    riskSnapshot: [],
    status: 'DRAFT',
  };
  const pcmat = {
    ...pcmso,
    id: '00000000-0000-4000-8000-000000067005',
    kind: 'PCMAT',
    responsibleDoctorName: 'Dra PCMAT',
  };
  const cipa = {
    id: '00000000-0000-4000-8000-000000067006',
    workLocationId: pcmso.workLocationId,
    workLocationName: 'Sede',
    electionCallRef: 'EDITAL-CIPA-2026',
    mandateStart: '2026-01-01',
    mandateEnd: '2026-12-31',
    status: 'DRAFT',
    metadata: { election: 'internal' },
  };

  beforeEach(async () => {
    process.env.AUTH_ALLOW_UNSIGNED_TEST_TOKENS = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useClass(FakeDatabaseService)
      .overrideProvider(HealthProgramService)
      .useValue({
        create: jest
          .fn()
          .mockImplementation((_body, kind) =>
            Promise.resolve(kind === 'PCMAT' ? pcmat : pcmso),
          ),
        activate: jest.fn().mockImplementation((_id, kind) =>
          Promise.resolve({
            ...(kind === 'PCMAT' ? pcmat : pcmso),
            status: 'ACTIVE',
          }),
        ),
        revise: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000067007',
          parentProgramKind: 'PCMAT',
          revisionNumber: 1,
        }),
        addRequiredExam: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000067003',
          health_program_id: pcmso.id,
          medical_exam_id: '00000000-0000-4000-8000-000000067004',
        }),
        list: jest
          .fn()
          .mockImplementation((kind) =>
            Promise.resolve([
              { ...(kind === 'PCMAT' ? pcmat : pcmso), status: 'ACTIVE' },
            ]),
          ),
      })
      .overrideProvider(RiskManagementProgramService)
      .useValue({
        create: jest.fn().mockResolvedValue(pgr),
        activate: jest.fn().mockResolvedValue({ ...pgr, status: 'ACTIVE' }),
        list: jest.fn().mockResolvedValue([{ ...pgr, status: 'ACTIVE' }]),
      })
      .overrideProvider(CipaCommitteeService)
      .useValue({
        list: jest.fn().mockResolvedValue([{ ...cipa, status: 'ACTIVE' }]),
        create: jest.fn().mockResolvedValue(cipa),
        activate: jest.fn().mockResolvedValue({ ...cipa, status: 'ACTIVE' }),
        addMember: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000067008',
          committeeId: cipa.id,
          employeeId: '00000000-0000-4000-8000-000000067009',
          role: 'EMPLOYEE_REPRESENTATIVE',
          status: 'ACTIVE',
        }),
        addMinute: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000067010',
          committeeId: cipa.id,
          subject: 'Monthly meeting',
          minutesUri:
            's3://sgp-docs.detran-am.sistematech.com.br/stage/t1/cipa/minute.pdf',
          sha256: 'a'.repeat(64),
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function server(): SupertestApp {
    return app.getHttpAdapter().getInstance() as SupertestApp;
  }

  it('creates and activates PGR and PCMSO, then links a periodic exam', async () => {
    await request(server())
      .post('/api/v1/saude/programas/pgr')
      .set('authorization', `Bearer ${token()}`)
      .send({
        workLocationId: pgr.workLocationId,
        validFrom: pgr.validFrom,
        validUntil: pgr.validUntil,
      })
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('DRAFT'));

    await request(server())
      .patch(`/api/v1/saude/programas/pgr/${pgr.id}/ativar`)
      .set('authorization', `Bearer ${token()}`)
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('ACTIVE'));

    await request(server())
      .post('/api/v1/saude/programas/pcmso')
      .set('authorization', `Bearer ${token()}`)
      .send({
        workLocationId: pcmso.workLocationId,
        validFrom: pcmso.validFrom,
        validUntil: pcmso.validUntil,
        responsibleDoctorCrm: pcmso.responsibleDoctorCrm,
        responsibleDoctorName: pcmso.responsibleDoctorName,
      })
      .expect(201);

    await request(server())
      .patch(`/api/v1/saude/programas/pcmso/${pcmso.id}/ativar`)
      .set('authorization', `Bearer ${token()}`)
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('ACTIVE'));

    await request(server())
      .post(`/api/v1/saude/programas/pcmso/${pcmso.id}/exames`)
      .set('authorization', `Bearer ${token()}`)
      .send({
        medicalExamId: '00000000-0000-4000-8000-000000067004',
        periodicityMonthsOverride: 12,
      })
      .expect(201);
  });

  it('creates PCMAT and CIPA operator evidence through API routes', async () => {
    await request(server())
      .post('/api/v1/saude/programas/pcmat')
      .set('authorization', `Bearer ${token()}`)
      .send({
        workLocationId: pcmat.workLocationId,
        validFrom: pcmat.validFrom,
        validUntil: pcmat.validUntil,
        responsibleDoctorCrm: pcmat.responsibleDoctorCrm,
        responsibleDoctorName: pcmat.responsibleDoctorName,
      })
      .expect(201)
      .expect((response) => expect(response.body.kind).toBe('PCMAT'));

    await request(server())
      .patch(`/api/v1/saude/programas/pcmat/${pcmat.id}/ativar`)
      .set('authorization', `Bearer ${token()}`)
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('ACTIVE'));

    await request(server())
      .post(`/api/v1/saude/programas/pcmat/${pcmat.id}/revisoes`)
      .set('authorization', `Bearer ${token()}`)
      .send({ revisionReason: 'ANNUAL' })
      .expect(201)
      .expect((response) =>
        expect(response.body.parentProgramKind).toBe('PCMAT'),
      );

    await request(server())
      .post('/api/v1/saude/programas/cipa/comissoes')
      .set('authorization', `Bearer ${token()}`)
      .send({
        workLocationId: cipa.workLocationId,
        electionCallRef: cipa.electionCallRef,
        mandateStart: cipa.mandateStart,
        mandateEnd: cipa.mandateEnd,
        metadata: cipa.metadata,
      })
      .expect(201)
      .expect((response) =>
        expect(response.body.electionCallRef).toBe(cipa.electionCallRef),
      );

    await request(server())
      .patch(`/api/v1/saude/programas/cipa/comissoes/${cipa.id}/ativar`)
      .set('authorization', `Bearer ${token()}`)
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('ACTIVE'));

    await request(server())
      .post(`/api/v1/saude/programas/cipa/comissoes/${cipa.id}/membros`)
      .set('authorization', `Bearer ${token()}`)
      .send({
        employeeId: '00000000-0000-4000-8000-000000067009',
        role: 'EMPLOYEE_REPRESENTATIVE',
        electedAt: '2026-01-02',
      })
      .expect(201)
      .expect((response) =>
        expect(response.body.role).toBe('EMPLOYEE_REPRESENTATIVE'),
      );

    await request(server())
      .post(`/api/v1/saude/programas/cipa/comissoes/${cipa.id}/atas`)
      .set('authorization', `Bearer ${token()}`)
      .send({
        meetingAt: '2026-02-01T12:00:00.000Z',
        subject: 'Monthly meeting',
        minutesUri:
          's3://sgp-docs.detran-am.sistematech.com.br/stage/t1/cipa/minute.pdf',
        sha256: 'a'.repeat(64),
      })
      .expect(201)
      .expect((response) => expect(response.body.sha256).toBe('a'.repeat(64)));
  });
});
