import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('transparency RLS canonical SQL', () => {
  it('keeps public snapshot reads tenant-scoped', () => {
    const canonicalSchema = readFileSync(
      resolve(__dirname, '../../database/sql/10-canonical-schema.sql'),
      'utf8',
    );

    expect(canonicalSchema).toContain(
      'ALTER TABLE public_data.transparency_payroll_snapshot ENABLE ROW LEVEL SECURITY',
    );
    expect(canonicalSchema).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(canonicalSchema).toContain("'public.read'::text");
    expect(canonicalSchema).toContain("'transparency.publish'::text");
  });
});
