import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AtosPessoalDraftPayload,
  AtosPessoalDraftSerializer,
  AtosPessoalState,
} from './atos-pessoal-draft.serializer';

describe('AtosPessoalDraftSerializer', () => {
  const serializer = new AtosPessoalDraftSerializer();
  const goldens = JSON.parse(
    readFileSync(
      join(
        __dirname,
        '../../../../../tests/backend/fixtures/tce/atos-pessoal/source-pending-goldens.json',
      ),
      'utf8',
    ),
  ) as Record<AtosPessoalState, Record<string, unknown>>;

  it.each(['SP', 'MG', 'RJ'] as AtosPessoalState[])(
    'serializes %s source-pending Atos de Pessoal golden',
    (stateCode) => {
      const payload = samplePayload(stateCode);
      const envelope = serializer.serialize(payload);

      expect(envelope).toMatchObject({
        contentType: 'application/json',
        payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(JSON.parse(envelope.body)).toEqual({
        ...goldens[stateCode],
        payload,
      });
    },
  );
});

function samplePayload(stateCode: AtosPessoalState): AtosPessoalDraftPayload {
  return {
    sourceStatus: 'UNVERIFIED_LAYOUT',
    stateCode,
    tenantId: '00000000-0000-0000-0000-000000000100',
    actId: `ATO-${stateCode}-001`,
    actKind: 'ADMISSION',
    employeeCpf: '11122233344',
    employeeRegistration: 'MAT-001',
    actDate: '2026-04-30',
  };
}
