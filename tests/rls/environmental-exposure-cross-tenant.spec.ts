import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('environmental exposure RLS canonical SQL', () => {
  it('uses tenant and SST-05/eSocial permissions on exposure, EPI, PPP, and S-2240 tables', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../database/sql/10-canonical-schema.sql'),
      'utf8',
    );

    expect(sql).toContain('ALTER TABLE saude.environmental_exposure FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE saude.epi_inventory FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE saude.epi_delivery FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE saude.ppp_record FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE esocial.s2240_pending FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('sgp_tenant_matches(tenant_id)');
    expect(sql).toContain('saude.exposure.read');
    expect(sql).toContain('saude.exposure.write');
    expect(sql).toContain('saude.epi.read');
    expect(sql).toContain('saude.epi.write');
    expect(sql).toContain('esocial.event.read');
    expect(sql).toContain('esocial.event.write');
  });
});
