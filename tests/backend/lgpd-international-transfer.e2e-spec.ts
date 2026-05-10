import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';

import { AppModule } from '../../backend/src/app.module';
import { SgpStynxTokenVerifier } from '../../backend/src/auth/sgp-stynx-token-verifier.service';
import { DatabaseService } from '../../backend/src/database/database.service';

const tenantId = '00000000-0000-0000-0000-000000000100';
const transferId = '00000000-0000-4000-8000-000000000612';

class FakeInternationalTransferDatabase {
  readonly configured = true;
  auditEvents = 0;
  transfer = transferRow({ status: 'DRAFT' });
  eventIds: string[] = [];

  async query<T>(sql: string, values: readonly unknown[] = []): Promise<T[]> {
    if (sql.includes('sgp_append_audit_event')) {
      this.auditEvents += 1;
      return [{ id: `audit-${this.auditEvents}` }] as T[];
    }
    if (sql.includes('INSERT INTO lgpd.international_transfer_event')) {
      const id = `event-${this.eventIds.length + 1}`;
      this.eventIds.push(id);
      return [{ id }] as T[];
    }
    if (sql.includes('INSERT INTO lgpd.international_transfer')) {
      this.transfer = transferRow({
        flow_key: values[1],
        origin_country: values[2],
        origin_region: values[3],
        destination_country: values[4],
        destination_region: values[5],
        processor_name: values[6],
        purpose: values[7],
        data_categories: values[8],
        mechanism: values[9],
        mechanism_reference: values[10],
        safeguards: values[11],
        review_due_at: values[12],
        notes: values[13],
        status: 'DRAFT',
      });
      return [{ id: transferId }] as T[];
    }
    if (sql.includes('UPDATE lgpd.international_transfer')) {
      if (values.includes('DPO_REVIEW')) {
        this.transfer = {
          ...this.transfer,
          status: 'DPO_REVIEW',
          notes: values[2] ?? this.transfer.notes,
        };
      } else if (values.includes('DPO-APPROVAL-2026-001')) {
        this.transfer = {
          ...this.transfer,
          status: 'ACTIVE',
          dpo_approval_ref: values[1],
          starts_at: values[2],
        };
      } else if (values.includes('2026-12-31')) {
        this.transfer = {
          ...this.transfer,
          status: 'CLOSED',
          ends_at: values[1],
          notes: values[3] ?? this.transfer.notes,
        };
      } else if (sql.includes('SET')) {
        this.transfer = { ...this.transfer, purpose: values[0] };
      }
      return [{ id: transferId }] as T[];
    }
    if (sql.includes('FROM lgpd.international_transfer transfer')) {
      if (sql.includes("WHERE transfer.status = 'ACTIVE'")) {
        return this.transfer.status === 'ACTIVE'
          ? ([publicTransferRow(this.transfer)] as T[])
          : ([] as T[]);
      }
      return [this.transfer] as T[];
    }
    return [] as T[];
  }
}

describe('LGPD international transfer API (e2e)', () => {
  let app: INestApplication;
  let database: FakeInternationalTransferDatabase;

  beforeAll(async () => {
    database = new FakeInternationalTransferDatabase();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SgpStynxTokenVerifier)
      .useValue({
        verifyAuthorizationHeader: jest.fn(async (authorization?: string) =>
          actorForToken(authorization),
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

  it('runs draft to DPO review to active to closed workflow', async () => {
    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/admin/lgpd/transferencias-internacionais')
      .set('Authorization', 'Bearer operator')
      .send({
        flowKey: 'payroll.payslip_pdf',
        destinationCountry: 'EU',
        processorName: 'EU Cloud Processor',
        purpose: 'Hosted payroll PDF delivery.',
        dataCategories: ['payroll', 'identification'],
        mechanism: 'ADEQUACY_DECISION',
        mechanismReference: 'Resolução CD/ANPD 32/2026',
        safeguards: ['tenant RLS', 'DPO approval'],
        reviewDueAt: '2027-05-08',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe('DRAFT');
        expect(body.destination.recognizedByAnpd).toBe(true);
      });

    await request(app.getHttpServer() as SupertestApp)
      .patch(
        `/api/v1/admin/lgpd/transferencias-internacionais/${transferId}/dpo-review`,
      )
      .set('Authorization', 'Bearer operator')
      .send({ notes: 'DPO packet complete.' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('DPO_REVIEW');
      });

    await request(app.getHttpServer() as SupertestApp)
      .patch(
        `/api/v1/admin/lgpd/transferencias-internacionais/${transferId}/approve`,
      )
      .set('Authorization', 'Bearer operator')
      .send({
        dpoApprovalRef: 'DPO-APPROVAL-2026-001',
        startsAt: '2026-05-08',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ACTIVE');
        expect(body.dpoApprovalRef).toBe('DPO-APPROVAL-2026-001');
      });

    await request(app.getHttpServer() as SupertestApp)
      .get('/api/v1/public/lgpd/transferencias-internacionais')
      .expect(200)
      .expect(({ body }) => {
        expect(body.items[0].processorName).toBe('EU Cloud Processor');
        expect(body.items[0].mechanismReference).toBe(
          'Resolução CD/ANPD 32/2026',
        );
      });

    await request(app.getHttpServer() as SupertestApp)
      .patch(
        `/api/v1/admin/lgpd/transferencias-internacionais/${transferId}/close`,
      )
      .set('Authorization', 'Bearer operator')
      .send({ endsAt: '2026-12-31', notes: 'Processor retired.' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('CLOSED');
      });

    expect(database.auditEvents).toBeGreaterThanOrEqual(4);
  });

  it('protects transfer administration with gestao.write', async () => {
    await request(app.getHttpServer() as SupertestApp)
      .post('/api/v1/admin/lgpd/transferencias-internacionais')
      .set('Authorization', 'Bearer readonly')
      .send({
        flowKey: 'payroll.payslip_pdf',
        destinationCountry: 'EU',
        processorName: 'EU Cloud Processor',
        purpose: 'Hosted payroll PDF delivery.',
        mechanism: 'ADEQUACY_DECISION',
        mechanismReference: 'Resolução CD/ANPD 32/2026',
      })
      .expect(403);
  });
});

function actorForToken(authorization?: string) {
  const token = authorization?.replace('Bearer ', '');
  const permissions =
    token === 'operator'
      ? ['auditoria.read', 'gestao.read', 'gestao.write']
      : ['auditoria.read'];

  return {
    sub: token === 'operator' ? 'operator-sub' : 'readonly-sub',
    username: token === 'operator' ? 'operator.local' : 'readonly.local',
    tenantId,
    groups: [],
    permissions,
  };
}

function transferRow(overrides: Record<string, unknown> = {}) {
  return {
    id: transferId,
    tenant_id: tenantId,
    ropa_entry_id: null,
    flow_key: 'payroll.payslip_pdf',
    origin_country: 'BR',
    origin_region: null,
    destination_country: 'EU',
    destination_region: null,
    destination_country_name: 'European Union',
    recognized_by_anpd: true,
    adequacy_decision_ref: 'Resolução CD/ANPD 32/2026',
    processor_name: 'EU Cloud Processor',
    purpose: 'Hosted payroll PDF delivery.',
    data_categories: ['payroll'],
    mechanism: 'ADEQUACY_DECISION',
    mechanism_reference: 'Resolução CD/ANPD 32/2026',
    safeguards: ['tenant RLS'],
    dpo_approval_ref: null,
    status: 'DRAFT',
    starts_at: null,
    ends_at: null,
    review_due_at: '2027-05-08',
    legal_citation: 'Lei 13.709/2018 art. 33; Resolução CD/ANPD 19/2024',
    notes: null,
    created_at: '2026-05-08T12:00:00.000Z',
    updated_at: '2026-05-08T12:00:00.000Z',
    ...overrides,
  };
}

function publicTransferRow(row: Record<string, unknown>) {
  return {
    flow_key: row.flow_key,
    processor_name: row.processor_name,
    destination_country: row.destination_country,
    destination_country_name: row.destination_country_name,
    mechanism: row.mechanism,
    mechanism_reference: row.mechanism_reference,
    adequacy_decision_ref: row.adequacy_decision_ref,
    starts_at: row.starts_at,
    review_due_at: row.review_due_at,
  };
}
