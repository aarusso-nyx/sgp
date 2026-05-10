import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = resolve(__dirname, '../..');

describe('fiscal.det_message_projection RLS contract', () => {
  const sql = readFileSync(
    resolve(workspaceRoot, 'database/sql/17-det-projection.sql'),
    'utf8',
  );

  it('stores only SGP-side DET projections and operator state', () => {
    expect(sql).toContain('CREATE TABLE fiscal.det_message_projection');
    expect(sql).toContain('source_payload jsonb');
    expect(sql).toContain('latest_update_payload jsonb');
    expect(sql).toContain('annotation text');
    expect(sql).not.toMatch(/det_credentials|credential_id|certificate_id/i);
  });

  it('forces tenant RLS with SGP-domain DET permissions', () => {
    expect(sql).toContain(
      'ALTER TABLE fiscal.det_message_projection FORCE ROW LEVEL SECURITY',
    );
    expect(sql).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(sql).toContain("'det.message.read'::text");
    expect(sql).toContain("'det.message.write'::text");
  });

  it('documents the stynx-det external-service boundary', () => {
    expect(sql).toContain('stynx-det owns polling');
    expect(sql).toContain('SGP stores operator-visible state only');
  });
});
