import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('health program RLS canonical SQL', () => {
  it('uses tenant and saude.program permissions on SST-02 tables', () => {
    const sql = readFileSync(resolve(__dirname, '../../database/sql/80-rls-saude.sql'), 'utf8');

    expect(sql).toContain('ALTER TABLE saude.health_program FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE saude.program_revision FORCE ROW LEVEL SECURITY');
    expect(sql).toContain("'saude.program.read'::text");
    expect(sql).toContain("'saude.program.write'::text");
    expect(sql).toContain('sgp_tenant_matches(tenant_id)');
  });
});
