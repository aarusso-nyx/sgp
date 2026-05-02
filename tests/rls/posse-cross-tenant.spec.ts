import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('REC-06 posse RLS policy', () => {
  it('uses tenant matching and recruitment/RH write permissions', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../../backend/prisma/migrations/20260502124000_rec_06_posse_exercicio/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('ALTER TABLE recrutamento.posse FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(migration).toContain("'recrutamento:read'");
    expect(migration).toContain("'recrutamento:write'");
    expect(migration).toContain("'rh:write'");
  });
});
