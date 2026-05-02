import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('health program RLS migration', () => {
  it('uses tenant and saude.program permissions on SST-02 tables', () => {
    const sql = readFileSync(
      resolve(
        __dirname,
        '../../backend/prisma/migrations/20260502103000_sst_02_pcmso_pgr/migration.sql',
      ),
      'utf8',
    );

    expect(sql).toContain('ALTER TABLE saude.health_program FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE saude.program_revision FORCE ROW LEVEL SECURITY');
    expect(sql).toContain("sgp_has_any_permission(ARRAY['saude.program.read', 'saude.program.write'])");
    expect(sql).toContain('sgp_tenant_matches(tenant_id)');
  });
});
