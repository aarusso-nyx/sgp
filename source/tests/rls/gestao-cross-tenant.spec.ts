import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('HR-06 gestao RLS policy', () => {
  it('uses tenant match plus gestao master-data permissions for work locations', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'backend/prisma/migrations/20260430225205_hr_06_org_structure/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('work_location');
    expect(migration).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(migration).toContain('gestao.master_data.read');
    expect(migration).toContain('gestao.master_data.write');
  });
});
