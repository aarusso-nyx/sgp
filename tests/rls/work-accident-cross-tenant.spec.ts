import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('work accident CAT RLS canonical SQL', () => {
  it('uses tenant and CAT/eSocial permissions on SST-03 tables', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../database/sql/10-canonical-schema.sql'),
      'utf8',
    );

    expect(sql).toContain('ALTER TABLE saude.work_accident FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE saude.cat_emission FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE esocial.s2210_pending FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('sgp_tenant_matches(tenant_id)');
    expect(sql).toContain('saude.cat.read');
    expect(sql).toContain('saude.cat.write');
    expect(sql).toContain('esocial.event.read');
    expect(sql).toContain('esocial.event.write');
  });
});
