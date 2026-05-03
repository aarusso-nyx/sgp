import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  StatePayrollDraftPayload,
  StatePayrollSourcePendingAdapter,
} from './state-payroll-adapter.base';
import { TceBaAdapter } from '../tce-ba/tce-ba.adapter';
import { TceCeAdapter } from '../tce-ce/tce-ce.adapter';
import { TceDfAdapter } from '../tce-df/tce-df.adapter';
import { TceGoAdapter } from '../tce-go/tce-go.adapter';
import { TceMgAdapter } from '../tce-mg/tce-mg.adapter';
import { TcePeAdapter } from '../tce-pe/tce-pe.adapter';
import { TcePrAdapter } from '../tce-pr/tce-pr.adapter';
import { TceRjAdapter } from '../tce-rj/tce-rj.adapter';
import { TceRsAdapter } from '../tce-rs/tce-rs.adapter';
import { TceScAdapter } from '../tce-sc/tce-sc.adapter';

const adapters: StatePayrollSourcePendingAdapter[] = [
  new TceBaAdapter(),
  new TceCeAdapter(),
  new TceDfAdapter(),
  new TceGoAdapter(),
  new TceMgAdapter(),
  new TcePeAdapter(),
  new TcePrAdapter(),
  new TceRjAdapter(),
  new TceRsAdapter(),
  new TceScAdapter(),
];

describe('state payroll source-pending TCE adapters', () => {
  const goldens = JSON.parse(
    readFileSync(
      join(
        __dirname,
        '../../../../../tests/backend/fixtures/tce/state-payroll/source-pending-goldens.json',
      ),
      'utf8',
    ),
  ) as Record<string, Record<string, unknown>>;

  it.each(adapters.map((adapter) => [adapter.id(), adapter] as const))(
    '%s validates and serializes the source-pending golden',
    async (_id, adapter) => {
      const payload = samplePayload();
      expect(adapter.validate(payload, '0.0.1')).toMatchObject({
        status: 'OK',
        errors: [],
      });

      const envelope = adapter.serialize(payload, '0.0.1');
      expect(envelope).toMatchObject({
        layoutVersion: '0.0.1',
        contentType: 'application/json',
        payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(JSON.parse(envelope.body)).toMatchObject({
        ...goldens[adapter.id()],
        payload,
      });

      const receipt = await adapter.submit(envelope);
      expect(receipt).toMatchObject({
        protocol: expect.stringMatching(
          new RegExp(`^SOURCE-PENDING-${adapter.state_code()}-`),
        ),
        status: 'PENDING',
      });
    },
  );
});

function samplePayload(): StatePayrollDraftPayload {
  return {
    sourceStatus: 'UNVERIFIED_LAYOUT',
    tenantId: '00000000-0000-0000-0000-000000000100',
    competence: '2026-04',
    payrollRunId: '00000000-0000-4000-8000-000000001200',
    rows: [
      {
        registration: 'MAT-001',
        cpf: '11122233344',
        grossAmount: '3000.00',
        deductionAmount: '330.00',
        netAmount: '2670.00',
      },
    ],
  };
}
