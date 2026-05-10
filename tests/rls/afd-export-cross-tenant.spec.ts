import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Afd Export Cross Tenant',
  specFile: 'tests/rls/afd-export-cross-tenant.spec.ts',
  directRlsAssertions: [
    {
      table: 'ponto.afd_export',
      evidence: [
        'CREATE TRIGGER afd_export_audit',
        'CREATE POLICY afd_export_rw ON ponto.afd_export USING ((public.sgp_tenant_matches(tenant_id)',
      ],
    },
    {
      table: 'ponto.afd_import',
      evidence: [
        'CREATE TRIGGER afd_import_audit',
        'CREATE POLICY afd_import_rw ON ponto.afd_import USING ((public.sgp_tenant_matches(tenant_id)',
      ],
    },
    {
      table: 'ponto.afd_import_line',
      evidence: [
        'CREATE TRIGGER afd_import_line_audit',
        'CREATE POLICY afd_import_line_rw ON ponto.afd_import_line USING ((public.sgp_tenant_matches(tenant_id)',
      ],
    },
    {
      table: 'ponto.time_record',
      evidence: [
        'CREATE TRIGGER time_record_audit',
        'CREATE TRIGGER time_record_append_only',
        'CREATE POLICY time_record_rw ON ponto.time_record USING ((public.sgp_tenant_matches(tenant_id)',
      ],
    },
    {
      table: 'ponto.time_record_identity',
      evidence: [
        'CREATE TRIGGER time_record_identity_register',
        'CREATE POLICY time_record_identity_rw ON ponto.time_record_identity USING ((public.sgp_tenant_matches(tenant_id)',
      ],
    },
  ],
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke through the PONTO-03 migration and RLS coverage check.',
    'Assertions:',
    '1. ponto.afd_export, ponto.afd_import, ponto.afd_import_line, ponto.time_record, and ponto.time_record_identity force RLS.',
    '2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.',
    '3. Reads require ponto.afd.read or ponto.afd.write.',
    '4. AFD mutations require ponto.afd.write; correction/time-record writes require ponto.timerecord.write and remain append-only.',
    '5. Export, import, imported-line, and time-record mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
