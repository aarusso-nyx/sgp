import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('HR-06 gestao RLS policy', () => {
  it('uses tenant match plus gestao master-data permissions for work locations', () => {
    const canonicalSchema = readFileSync(
      resolve(process.cwd(), 'database/sql/10-canonical-schema.sql'),
      'utf8',
    );

    expect(canonicalSchema).toContain('ALTER TABLE hr.work_location ENABLE ROW LEVEL SECURITY');
    expect(canonicalSchema).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(canonicalSchema).toContain('gestao.master_data.read');
    expect(canonicalSchema).toContain('gestao.master_data.write');
  });
});
