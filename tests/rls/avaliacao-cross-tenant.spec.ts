import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Avaliacao Cross Tenant',
  specFile: 'tests/rls/avaliacao-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'REC-03 RLS acceptance probe.',
    'Assertions:',
    '1. recrutamento.prova, questao, gabarito, resposta_candidato, recurso, and nota are tenant-scoped through sgp_tenant_matches(tenant_id).',
    '2. SELECT requires recrutamento.avaliacao.read, recrutamento.avaliacao.write, recrutamento.read, or recrutamento.write.',
    '3. INSERT/UPDATE/DELETE require recrutamento.avaliacao.write or recrutamento.write.',
    '4. Tenant B cannot observe Tenant A exams, answer keys, resources, candidate answers, or notes.',
    '5. Public note lookup is controller-token scoped and not exposed as a database policy.',
    '6. Mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
