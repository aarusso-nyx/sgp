import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Nomeacao Cross Tenant',
  specFile: 'tests/rls/nomeacao-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'REC-05 RLS acceptance probe.',
    'Assertions:',
    '1. recrutamento.nomeacao and recrutamento.convocacao are tenant-scoped through sgp_tenant_matches(tenant_id).',
    '2. SELECT requires recrutamento.nomeacao.read, recrutamento.nomeacao.write, recrutamento:read, or recrutamento:write.',
    '3. INSERT/UPDATE/DELETE require recrutamento.nomeacao.write or recrutamento:write.',
    '4. Tenant B cannot observe tenant A appointment or notice records.',
    '5. Deadline expiration is idempotent and releases the next call order candidate.',
    '6. Mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
