import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

describe('Reintegration S-2298 RLS cross-tenant policy', () => {
  const maybeIt = databaseUrl ? it : it.skip;

  maybeIt('hides reintegration orders from another tenant', async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL row_security = on');
      await client.query(
        "SELECT set_config('app.current_tenant_id', '00000000-0000-0000-0000-000000077011', true)",
      );
      await client.query(
        "SELECT set_config('app.current_permissions', 'esocial.event.read', true)",
      );
      await client.query("SELECT set_config('app.authenticated', 'true', true)");
      const result = await client.query<{ count: string }>(`
        SELECT count(*)::text
        FROM hr.reintegration_order
        WHERE tenant_id = '00000000-0000-0000-0000-000000077010'::uuid
      `);
      expect(result.rows[0].count).toBe('0');
      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });
});
