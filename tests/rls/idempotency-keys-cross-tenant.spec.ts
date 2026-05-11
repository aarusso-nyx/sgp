import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Idempotency Keys Cross Tenant',
  specFile: 'tests/rls/idempotency-keys-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO public.idempotency_keys'],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0 idempotency_keys rows from tenant A'],
  assertionSummary: [
    'Exercised by npm run db:smoke in the HTTP idempotency bootstrap assertions.',
    'Assertions:',
    '1. tenant A can insert and read its own public.idempotency_keys row.',
    '2. tenant B SELECT on tenant A public.idempotency_keys returns 0 rows.',
  ],
  directRlsAssertions: [
    {
      table: 'public.idempotency_keys',
      evidence: ['CREATE POLICY idempotency_keys_tenant_isolation ON public.idempotency_keys'],
    },
  ],
});
