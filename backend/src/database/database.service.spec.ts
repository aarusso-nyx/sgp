import { Pool } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from './database.service';
import { TenantContextMissingError } from './tenant-context-missing.error';

const mockConnect = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    end: mockEnd,
  })),
}));

describe('DatabaseService', () => {
  const createService = (databaseUrl?: string) =>
    new DatabaseService({
      get: jest.fn((key: string) =>
        key === 'DATABASE_URL'
          ? databaseUrl
          : key === 'SGP_PII_PGCRYPTO_KEY'
            ? 'test-pii-secret'
            : key === 'SGP_PII_PGCRYPTO_KEY_ID'
              ? 'test-pii-key'
              : undefined,
      ),
    } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports DATABASE_URL configuration and rejects queries without it', async () => {
    const service = createService();

    expect(service.configured).toBe(false);
    await expect(service.query('SELECT 1')).rejects.toThrow(
      'DATABASE_URL is not configured',
    );
  });

  it('applies request context and commits successful queries', async () => {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql === 'SELECT $1::text AS value') {
          return { rows: [{ value: 'ok' }] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(client);
    const service = createService('postgresql://localhost/sgp-test');

    const rows = await RequestContextStore.run(
      {
        requestId: 'req-1',
        actor: {
          sub: 'sub-1',
          username: 'tester',
          tenantId: '00000000-0000-0000-0000-000000000100',
          groups: [' admin ', '', 'rh'],
          permissions: [' read ', null as never, 'write'],
        },
        bypassRls: true,
      },
      () => service.query('SELECT $1::text AS value', ['ok']),
    );

    expect(service.configured).toBe(true);
    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost/sgp-test',
      max: 10,
      idleTimeoutMillis: 30_000,
    });
    expect(rows).toEqual([{ value: 'ok' }]);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).toHaveBeenCalledWith('SELECT $1::text AS value', [
      'ok',
    ]);
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_permissions', 'read\nwrite'],
    );
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_groups', 'admin\nrh'],
    );
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.bypass_rls', 'true'],
    );
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.pii_encryption_key', 'test-pii-secret'],
    );
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.pii_encryption_key_id', 'test-pii-key'],
    );
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('sets the session tenant from the actor tenant', async () => {
    const client = {
      query: jest.fn(async () => ({ rows: [] })),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(client);
    const service = createService('postgresql://localhost/sgp-test');

    await RequestContextStore.run(
      {
        actor: {
          sub: 'sub-tenant',
          username: 'tenant-user',
          tenantId: 'tenant-from-actor',
          groups: [],
          permissions: [],
        },
      },
      () => service.query('SELECT 1'),
    );

    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_tenant_id', 'tenant-from-actor'],
    );
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_tenant', 'tenant-from-actor'],
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('uses fallback context values, rolls back failed queries, and ends the pool', async () => {
    const error = new Error('query failed');
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql === 'SELECT broken') throw error;
        if (sql === 'ROLLBACK') throw new Error('rollback failed');
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(client);
    const service = createService('postgresql://localhost/sgp-test');

    await expect(
      RequestContextStore.run(
        {
          requestId: 'req-2',
          tenantId: 'tenant-from-context',
          permissions: ['perm'],
          groups: ['group'],
        },
        () => service.query('SELECT broken'),
      ),
    ).rejects.toBe(error);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_user_sub', ''],
    );
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_tenant', 'tenant-from-context'],
    );
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.authenticated', 'false'],
    );
    expect(client.release).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
    await service.onModuleDestroy();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it('rejects bypassed queries touching sensitive RLS tables without an allowlisted job reason', async () => {
    const service = createService('postgresql://localhost/sgp-test');

    await expect(
      RequestContextStore.run({ bypassRls: true }, () =>
        service.query('SELECT * FROM payroll_calc.formula_cache'),
      ),
    ).rejects.toThrow('app.bypass_rls=true is not allowed');

    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('allows declared jobs to bypass RLS for sensitive table maintenance', async () => {
    const client = {
      query: jest.fn(async () => ({ rows: [] })),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(client);
    const service = createService('postgresql://localhost/sgp-test');

    await RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'payroll-engine' },
      () => service.query('SELECT * FROM payroll_calc.formula_cache'),
    );

    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).toHaveBeenCalledWith(
      'SELECT set_config($1, $2, true)',
      ['app.current_tenant_id', ''],
    );
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('throws TenantContextMissingError when no tenant context is available', async () => {
    const client = {
      query: jest.fn(async () => ({ rows: [] })),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(client);
    const service = createService('postgresql://localhost/sgp-test');

    await expect(
      RequestContextStore.run({ requestId: 'req-no-tenant' }, () =>
        service.query('SELECT 1'),
      ),
    ).rejects.toBeInstanceOf(TenantContextMissingError);

    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('SELECT 1', []);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
