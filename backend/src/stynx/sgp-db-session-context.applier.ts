import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DbContextApplier, DbSessionContext } from '@stynx-nyx/contracts';
import type { PoolClient } from 'pg';

@Injectable()
export class SgpDbSessionContextApplier implements DbContextApplier<PoolClient> {
  constructor(private readonly configService: ConfigService) {}

  async apply(client: PoolClient, context: DbSessionContext): Promise<void> {
    const settings: ReadonlyArray<readonly [string, string]> = [
      ['app.request_id', context.requestId ?? ''],
      ['app.current_user_sub', context.userId ?? ''],
      ['app.current_login', this.extraText(context, 'login')],
      ['app.current_tenant_id', context.tenantId ?? ''],
      ['app.current_tenant', context.tenantId ?? ''],
      ['app.current_employee_id', this.extraText(context, 'employeeId')],
      ['app.current_permissions', (context.permissions ?? []).join('\n')],
      ['app.current_groups', (context.roles ?? []).join('\n')],
      ['app.authenticated', this.extraBoolean(context, 'authenticated')],
      ['app.bypass_rls', this.extraBoolean(context, 'bypassRls')],
      [
        'app.pii_encryption_key',
        this.configService.get<string>('SGP_PII_PGCRYPTO_KEY') ?? '',
      ],
      [
        'app.pii_encryption_key_id',
        this.configService.get<string>('SGP_PII_PGCRYPTO_KEY_ID') ?? '',
      ],
    ];

    await client.query('SET LOCAL row_security = on');
    for (const [name, value] of settings) {
      await client.query('SELECT set_config($1, $2, true)', [name, value]);
    }
  }

  private extraText(context: DbSessionContext, key: string): string {
    const value = context.extras?.[key];
    return typeof value === 'string' ? value : '';
  }

  private extraBoolean(context: DbSessionContext, key: string): string {
    return context.extras?.[key] === true ? 'true' : 'false';
  }
}
