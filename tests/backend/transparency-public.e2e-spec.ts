import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';

import { AppModule } from '../../backend/src/app.module';
import { DatabaseService } from '../../backend/src/database/database.service';

class FakeTransparencyDatabase {
  readonly configured = true;
  readonly queries: string[] = [];

  query<T>(sql: string): Promise<T[]> {
    this.queries.push(sql);
    if (sql.includes('transparency_publish_event')) {
      return Promise.resolve([{ snapshot_hash: 'hash-1' }] as T[]);
    }
    if (sql.includes('count(*)::text')) {
      return Promise.resolve([{ total: '1' }] as T[]);
    }
    if (sql.includes('transparency_payroll_snapshot')) {
      return Promise.resolve([
        {
          tenant_id: '00000000-0000-4000-8000-000000000001',
          competence: '2026-04-01',
          employee_public_id: 'pub-1',
          full_name: 'Ana Silva',
          registration_number: 'MAT-1',
          position_name: 'Analista',
          organizational_unit: 'Administracao',
          gross_total: '1000.00',
          deductions_total: '100.00',
          net_total: '900.00',
          snapshot_taken_at: '2026-05-02 00:00:00+00',
        },
      ] as T[]);
    }
    return Promise.resolve([] as T[]);
  }
}

describe('public transparency endpoints', () => {
  let app: INestApplication<SupertestApp>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(new FakeTransparencyDatabase())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds without a token and excludes protected fields', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/public/transparency/00000000-0000-4000-8000-000000000001/payroll',
      )
      .expect(200);

    expect(JSON.stringify(response.body)).not.toMatch(
      /cpf|bank|dependent|address/i,
    );
    expect(response.body.items[0]).toMatchObject({
      fullName: 'Ana Silva',
      netTotal: '900.00',
    });
  });
});
