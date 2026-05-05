import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Aso Self Only',
  specFile: 'tests/rls/aso-self-only.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  directRlsAssertions: [
    { table: 'saude.aso_attachment' },
    { table: 'saude.aso_exam_item' },
    { table: 'saude.aso_record' },
  ],
  assertionSummary: [
    'Exercised by SST-01 portal ASO assertions.',
    'Assertions:',
    'saude.aso_record self_read can see only rows where aso_record.employee_id = sgp_current_employee_id().',
    'saude.aso_exam_item self_read is constrained through its parent saude.aso_record and sgp_current_employee_id().',
    'saude.aso_attachment self_read is constrained through its parent saude.aso_record and sgp_current_employee_id().',
    'portal ASO endpoints expose dates, kind, conclusion, status, and next due date only.',
    'clinical restriction text and raw attachment data remain restricted to saude.aso.read/write.',
  ],
});
