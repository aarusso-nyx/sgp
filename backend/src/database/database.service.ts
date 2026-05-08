import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { TenantContextMissingError } from './tenant-context-missing.error';

const SENSITIVE_RLS_TABLES = [
  /\bhr\.employee_dependent\b/i,
  /\bpayroll_calc\.formula_cache\b/i,
];

const BYPASS_RLS_ALLOWLIST = new Set(['payroll-engine', 'integrations-worker']);

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool?: Pool | undefined;

  constructor(private readonly configService: ConfigService) {}

  get configured(): boolean {
    return Boolean(this.configService.get<string>('DATABASE_URL'));
  }

  async query<T extends QueryResultRow>(
    sql: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    this.assertBypassRlsAllowed(sql);
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

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      await this.applySessionContext(client);
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
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
    const tenantId =
      actor?.tenantId ??
      context?.tenantId ??
      this.resolveBypassTenantFallback(context);
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
      'app.current_employee_id',
      this.claimText(actor?.claims?.employee_id),
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
    await client.query('SELECT set_config($1, $2, true)', [
      'app.pii_encryption_key',
      this.configService.get<string>('SGP_PII_PGCRYPTO_KEY') ?? '',
    ]);
    await client.query('SELECT set_config($1, $2, true)', [
      'app.pii_encryption_key_id',
      this.configService.get<string>('SGP_PII_PGCRYPTO_KEY_ID') ?? '',
    ]);
  }

  private assertBypassRlsAllowed(sql: string): void {
    const context = RequestContextStore.get();
    if (!context?.bypassRls) return;

    const touchesSensitiveTable = SENSITIVE_RLS_TABLES.some((pattern) =>
      pattern.test(sql),
    );
    if (!touchesSensitiveTable) return;

    const reason = context.bypassRlsReason ?? '';
    if (BYPASS_RLS_ALLOWLIST.has(reason)) return;

    throw new Error(
      `app.bypass_rls=true is not allowed for sensitive RLS tables without an allowlisted job reason: ${reason || 'unspecified'}`,
    );
  }

  private resolveBypassTenantFallback(
    context: ReturnType<typeof RequestContextStore.get>,
  ): string {
    if (
      context?.bypassRls &&
      BYPASS_RLS_ALLOWLIST.has(context.bypassRlsReason ?? '')
    ) {
      return '';
    }

    throw new TenantContextMissingError();
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

  private claimText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
