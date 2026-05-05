import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = resolve(__dirname, '../..');

function readCanonicalSql(): string {
  const sqlDir = resolve(workspaceRoot, 'database/sql');
  return readdirSync(sqlDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort()
    .map((fileName) => readFileSync(resolve(sqlDir, fileName), 'utf8'))
    .join('\n');
}

function readSpoolSql(): string {
  return readFileSync(resolve(workspaceRoot, 'database/sql/16-esocial-events.sql'), 'utf8');
}

describe('public.esocial_events RLS contract', () => {
  const sql = readCanonicalSql();
  const spoolSql = readSpoolSql();

  it('declares the SGP-side canonical spool table without cross-boundary stynx FKs', () => {
    expect(spoolSql).toContain('CREATE TABLE public.esocial_events');
    expect(spoolSql).toContain('CONSTRAINT esocial_events_tenant_fkey');
    expect(spoolSql).not.toMatch(/REFERENCES\s+esocial\./i);
    expect(spoolSql).not.toMatch(/FOREIGN\s+DATA\s+WRAPPER/i);
  });

  it('forces tenant RLS and the esocial_events_tenant_isolation policy', () => {
    expect(sql).toContain('ALTER TABLE public.esocial_events FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY esocial_events_tenant_isolation ON public.esocial_events');
    expect(sql).toContain('public.sgp_tenant_matches(tenant_id)');
    expect(sql).toContain("'esocial.event.read'::text");
    expect(sql).toContain("'esocial.event.write'::text");
  });

  it('keeps the idempotency, lookup, GIN, and LGPD catalog surfaces', () => {
    expect(sql).toContain('esocial_events_active_payload_hash_uidx');
    expect(sql).toContain('esocial_events_tenant_status_created_idx');
    expect(sql).toContain('esocial_events_kind_event_created_idx');
    expect(sql).toContain('esocial_events_source_ref_gin_idx');
    expect(sql).toContain('sgp_apply_esocial_events_pii_comments');
    expect(sql).toContain('category=esocial_message_payload');
    expect(sql).toContain('category=esocial_message_response');
  });
});
