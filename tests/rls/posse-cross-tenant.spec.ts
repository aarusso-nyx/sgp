import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('REC-06 posse RLS policy', () => {
  it('uses tenant matching and recruitment/RH write permissions', () => {
    const canonicalSchema = readFileSync(
      resolve(__dirname, '../../database/sql/80-rls-recrutamento.sql'),
      'utf8',
    );

    expect(canonicalSchema).toContain(
      'ALTER TABLE ONLY recrutamento.posse FORCE ROW LEVEL SECURITY',
    );
    expect(canonicalSchema).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(canonicalSchema).toContain("'recrutamento:read'::text");
    expect(canonicalSchema).toContain("'recrutamento:write'::text");
    expect(canonicalSchema).toContain("'rh:write'::text");
  });
});
