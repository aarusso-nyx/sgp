import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('transparency RLS migration', () => {
  it('keeps public snapshot reads tenant-scoped', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../../backend/prisma/migrations/20260502060000_xcut_02_transparency/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('ALTER TABLE public_data.transparency_payroll_snapshot ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(migration).toContain("public.sgp_has_any_permission(ARRAY['public.read', 'transparency.publish'])");
  });
});
