import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LAI request SQL contract', () => {
  const ddl = readFileSync(
    resolve(__dirname, '../../../../database/sql/10-09-public_data-ddl.sql'),
    'utf8',
  );
  const functions = readFileSync(
    resolve(__dirname, '../../../../database/sql/40-public_data-functions.sql'),
    'utf8',
  );
  const final = readFileSync(
    resolve(__dirname, '../../../../database/sql/70-public_data-final.sql'),
    'utf8',
  );

  it('persists request state and history in public_data', () => {
    expect(ddl).toContain('CREATE TABLE public_data.lai_request');
    expect(ddl).toContain('CREATE TABLE public_data.lai_request_event');
    expect(ddl).toContain("status text DEFAULT 'RECEIVED'");
    expect(ddl).toContain('access_key_hash text NOT NULL');
  });

  it('pins Lei 12.527/2011 response and extension timers', () => {
    expect(functions).toContain("interval '20 days'");
    expect(functions).toContain("interval '10 days'");
  });

  it('keeps audit and RLS controls attached to the workflow tables', () => {
    expect(functions).toContain('public.sgp_append_audit_event');
    expect(final).toContain('ALTER TABLE ONLY public_data.lai_request');
    expect(final).toContain('FORCE ROW LEVEL SECURITY');
    expect(final).toContain('CREATE TRIGGER lai_request_audit');
  });
});
