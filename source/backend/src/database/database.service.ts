import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool?: Pool;

  constructor(private readonly configService: ConfigService) {}

  get configured(): boolean {
    return Boolean(this.configService.get<string>('DATABASE_URL'));
  }

  async query<T extends QueryResultRow>(
    sql: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      await this.applySessionContext(client);
      const result = await client.query<T>(sql, [...values]);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // no-op
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
  }

  private async applySessionContext(client: PoolClient): Promise<void> {
    const context = RequestContextStore.get();
    const actor = context?.actor;
    const tenantId = actor?.tenantId ?? context?.tenantId ?? '';
    const permissions = (actor?.permissions ?? context?.permissions ?? [])
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean);
    const groups = (actor?.groups ?? context?.groups ?? [])
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean);
    const authenticated = Boolean(actor?.sub);

    await client.query('SET LOCAL row_security = on');
    await client.query('SELECT set_config($1, $2, true)', [
      'app.request_id',
      context?.requestId ?? '',
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_user_sub',
      actor?.sub ?? '',
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_login',
      actor?.username ?? '',
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_tenant_id',
      tenantId,
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_tenant',
      tenantId,
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_permissions',
      permissions.join('\n'),
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.current_groups',
      groups.join('\n'),
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.authenticated',
      authenticated ? 'true' : 'false',
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.bypass_rls',
      context?.bypassRls ? 'true' : 'false',
    ]);
  }

  private getPool(): Pool {
    if (this.pool) return this.pool;

    const connectionString = this.configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }

    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
    return this.pool;
  }
}
