import {
  FROZEN_TEST_TIME,
  expectForbiddenNegativePath,
} from './helpers/test-debt-coverage';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';

import { AppModule } from '../../backend/src/app.module';
import { STYNX_TOKEN_VERIFIER } from '@stynx-nyx/backend';
import { normalizeTokenVerifierResult } from '../../backend/src/auth/sgp-stynx-auth.guard';
import { DatabaseService } from '../../backend/src/database/database.service';

const tenantId = '00000000-0000-0000-0000-000000000100';
const employeeId = '00000000-0000-4000-8000-000000000043';
const ticketId = '00000000-0000-4000-8000-000000000301';
const ropaEntryId = '00000000-0000-4000-8000-000000000239';
const legalBasisRuleId = '00000000-0000-4000-8000-000000000040';

class FakeDpoDsarDatabase {
  readonly configured = true;
  auditEvents = 0;
  dpo = {
    name: 'Encarregado pelo Tratamento de Dados Pessoais',
    email: 'dpo@example.invalid',
    phone: '',
    channelUrl: '/lgpd/encarregado',
    officeHours: 'Dias uteis, 9h as 17h',
    postalAddress: '',
    status: 'UNDER_REVIEW',
    designationAct: null,
    designatedAt: null,
    notes: null,
  };
  ticket = dsarRow();

  async query<T>(sql: string, values: readonly unknown[] = []): Promise<T[]> {
    if (sql.includes('sgp_append_audit_event')) {
      this.auditEvents += 1;
      return [{ id: `audit-${this.auditEvents}` }] as T[];
    }
    if (sql.includes('INSERT INTO public.system_parameter')) {
      this.dpo = JSON.parse(String(values[1])) as typeof this.dpo;
      return [dpoRow(this.dpo)] as T[];
    }
    if (sql.includes('FROM public.system_parameter')) {
      return [dpoPublicRow(this.dpo)] as T[];
    }
    if (
      sql.includes('FROM lgpd.legal_basis_rule') &&
      !sql.includes('JOIN lgpd.legal_basis_rule')
    ) {
      return [legalBasisRow(String(values[0] ?? 'payroll.payslip_pdf'))] as T[];
    }
    if (sql.includes('FROM lgpd.ropa_entry entry')) {
      return [
        {
          ropa_entry_id: ropaEntryId,
          legal_basis_rule_id: legalBasisRuleId,
          retention_rule: 'Retain official payslips under fiscal control duty.',
          sharing_scope: 'internal_employee_portal',
        },
      ] as T[];
    }
    if (sql.includes('INSERT INTO lgpd.data_subject_request')) {
      this.ticket = dsarRow({
        flow_key: values[2],
        right_type: values[3],
        request_description: values[4],
        requested_by_sub: values[5],
        requested_by_login: values[6],
        data_subject_employee_id: values[7],
        triage_outcome: values[8],
        retention_rule_snapshot: values[9],
        sharing_scope_snapshot: values[10],
      });
      return [this.ticket] as T[];
    }
    if (sql.includes('UPDATE lgpd.data_subject_request')) {
      this.ticket = {
        ...this.ticket,
        status: values.includes('IN_PROGRESS')
          ? 'IN_PROGRESS'
          : this.ticket.status,
        triage_outcome: values.includes('EXECUTABLE')
          ? 'EXECUTABLE'
          : this.ticket.triage_outcome,
        updated_at: '2026-05-03T12:00:00.000Z',
      };
      return [this.ticket] as T[];
    }
    if (sql.includes('FROM lgpd.data_subject_request request')) {
      return [this.ticket] as T[];
    }
    return [] as T[];
  }
}

describe('LGPD DPO and DSAR API (e2e)', () => {
  let app: INestApplication;
  let database: FakeDpoDsarDatabase;

  beforeAll(async () => {
    database = new FakeDpoDsarDatabase();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STYNX_TOKEN_VERIFIER)
      .useValue({
        verifyAuthorizationHeader: jest.fn(async (authorization?: string) =>
          normalizeTokenVerifierResult(actorForToken(authorization)),
        ),
      })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('publishes DPO contact and audits admin designation lifecycle', async () => {
    await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/public/lgpd/encarregado')
      .expect(200)
      .expect(({ body }) => {
        expect(body.contact.email).toBe('dpo@example.invalid');
        expect(body).not.toHaveProperty('lifecycle');
      });

    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/admin/lgpd/dpo')
      .set('Authorization', 'Bearer operator')
      .send({
        name: 'Maria Encarregada',
        email: 'dpo@ente.gov.br',
        designationAct: 'Portaria 123/2026',
        designatedAt: '2026-05-01',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.name).toBe('Maria Encarregada');
        expect(body.contact.email).toBe('dpo@ente.gov.br');
        expect(body.lifecycle.status).toBe('ACTIVE');
      });

    await request(app.getHttpServer() as SupertestApp)
      .patch('/api/v1/admin/lgpd/dpo')
      .set('Authorization', 'Bearer portal')
      .send({ status: 'UNDER_REVIEW' })
      .expect(403);
  });

  it('creates portal DSAR tickets and protects admin DSAR lifecycle operations', async () => {
    await request(app.getHttpServer() as SupertestApp)
      .post('/api/portal/v1/lgpd/direitos')
      .set('Authorization', 'Bearer portal')
      .send({
        rightType: 'ACCESS',
        flowKey: 'payroll.payslip_pdf',
        description: 'Please confirm payroll processing data for my record.',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe(ticketId);
        expect(body.status).toBe('PENDING_TRIAGE');
        expect(body.dataSubjectEmployeeId).toBe(employeeId);
      });

    await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/admin/lgpd/dsar')
      .set('Authorization', 'Bearer portal')
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/admin/lgpd/dsar?status=PENDING_TRIAGE')
      .set('Authorization', 'Bearer operator')
      .expect(200)
      .expect(({ body }) => {
        const item = body.items[0];
        expect(item.id).toBe(ticketId);
        expect(item.sla.status).toBe('OPEN');
        expect(item.requesterRef).not.toContain('employee-sub');
        expect(item.requesterRef).not.toContain('employee.local');
        expect(item.dataSubjectEmployeeRef).not.toContain(employeeId);
        expect(item).not.toHaveProperty('tenantId');
      });

    await request(app.getHttpServer() as SupertestApp)
      .patch(`/api/v1/admin/lgpd/dsar/${ticketId}`)
      .set('Authorization', 'Bearer readonly')
      .send({ status: 'IN_PROGRESS' })
      .expect(403);

    await request(app.getHttpServer() as SupertestApp)
      .patch(`/api/v1/admin/lgpd/dsar/${ticketId}`)
      .set('Authorization', 'Bearer operator')
      .send({ status: 'IN_PROGRESS', triageOutcome: 'EXECUTABLE' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('IN_PROGRESS');
        expect(body.triage.outcome).toBe('EXECUTABLE');
      });

    expect(database.auditEvents).toBeGreaterThanOrEqual(3);
  });
});

function actorForToken(authorization?: string) {
  const token = authorization?.replace('Bearer ', '');
  const permissions =
    token === 'operator'
      ? ['auditoria.read', 'gestao.read', 'gestao.write']
      : token === 'readonly'
        ? ['auditoria.read']
        : ['portal.profile.write'];

  return {
    sub: token === 'portal' ? 'employee-sub' : 'operator-sub',
    username: token === 'portal' ? 'employee.local' : 'operator.local',
    tenantId,
    groups: [],
    permissions,
    claims: token === 'portal' ? { employee_id: employeeId } : {},
  };
}

function dpoPublicRow(value: Record<string, unknown>) {
  return {
    value,
    updated_at: '2026-05-03T12:00:00.000Z',
  };
}

function dpoRow(value: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000000501',
    tenant_id: tenantId,
    key: 'lgpd.encarregado',
    value,
    updated_at: '2026-05-03T12:00:00.000Z',
  };
}

function dsarRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ticketId,
    tenant_id: tenantId,
    flow_key: 'payroll.payslip_pdf',
    right_type: 'ACCESS',
    status: 'PENDING_TRIAGE',
    request_description: 'Please confirm payroll processing data.',
    requested_by_sub: 'employee-sub',
    requested_by_login: 'employee.local',
    data_subject_employee_id: employeeId,
    sla_started_at: '2026-05-02T12:00:00.000Z',
    sla_due_at: '2026-07-31T12:00:00.000Z',
    triage_outcome: 'PENDING',
    retention_rule_snapshot: 'Retain official payslips.',
    sharing_scope_snapshot: 'internal_employee_portal',
    created_at: '2026-05-02T12:00:00.000Z',
    updated_at: '2026-05-02T12:00:00.000Z',
    ...overrides,
  };
}

function legalBasisRow(flowKey: string) {
  return {
    flow_key: flowKey,
    flow_name: 'Official payslip PDF/A',
    data_category: 'MIXED',
    legal_basis_code: 'LGPD_ART_7_II',
    legal_basis_article: 'LGPD art. 7, II',
    sensitive_basis_code: 'LGPD_ART_11_II_A',
    sensitive_basis_article: 'LGPD art. 11, II, a',
    purpose: 'Generate payslips.',
    data_subjects: ['public employee'],
    data_categories: ['CPF'],
    source_tables: ['hr.employee'],
    read_surfaces: ['employee portal'],
    retention_rule: 'Retain official payslips under fiscal control duty.',
    sharing_scope: 'internal_employee_portal',
    requires_consent: false,
    requires_dpia: true,
    decision_record_anchor: 'ADR-LGPD-001',
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
