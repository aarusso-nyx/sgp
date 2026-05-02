import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

describe('DCTFWeb RLS cross-tenant policy', () => {
  const maybeIt = databaseUrl ? it : it.skip;

  maybeIt('hides declarations from another tenant', async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL row_security = on");
      await client.query(
        "SELECT set_config('app.current_tenant_id', '00000000-0000-0000-0000-00000000f501', true)",
      );
      await client.query(
        "SELECT set_config('app.current_permissions', 'fiscal.dctfweb.read', true)",
      );
      await client.query("SELECT set_config('app.authenticated', 'true', true)");
      const result = await client.query<{ count: string }>(`
        SELECT count(*)::text
        FROM fiscal.dctfweb_declaration
        WHERE tenant_id = '00000000-0000-0000-0000-00000000f502'::uuid
      `);
      expect(result.rows[0].count).toBe('0');
      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });
});
