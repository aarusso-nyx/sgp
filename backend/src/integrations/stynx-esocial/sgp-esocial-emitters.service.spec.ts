import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  SgpEsocialEmittersService,
  stableJsonSha256,
} from './sgp-esocial-emitters.service';

const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const SOURCE_ID = '00000000-0000-4000-8000-000000000101';

const EMITTER_CASES = [
  ['s1000EmployerRegistration', 'S-1000', 'tabelas', 'hr.company'],
  ['s1005Establishment', 'S-1005', 'tabelas', 'hr.work_location'],
  [
    's1010EarningDeduction',
    'S-1010',
    'tabelas',
    'payroll.payroll_earning_deduction',
  ],
  ['s1020TaxLocation', 'S-1020', 'tabelas', 'hr.tax_location'],
  ['s1030JobPosition', 'S-1030', 'tabelas', 'hr.job_position'],
  ['s1040Role', 'S-1040', 'tabelas', 'hr.role'],
  ['s1050WorkSchedule', 'S-1050', 'tabelas', 'ponto.work_schedule'],
  ['s1060WorkEnvironment', 'S-1060', 'tabelas', 'saude.work_environment'],
  [
    's1070AdministrativeProcess',
    'S-1070',
    'tabelas',
    'hr.administrative_process',
  ],
  [
    's2205CadastralChange',
    'S-2205',
    'trabalhador',
    'hr.cadastral_change_request',
  ],
  ['s2206ContractChange', 'S-2206', 'trabalhador', 'hr.employment_link'],
  ['s2250PriorNotice', 'S-2250', 'trabalhador', 'hr.termination_notice'],
  ['s2230Leave', 'S-2230', 'trabalhador', 'hr.leave_record'],
  ['s2221ToxicologyTest', 'S-2221', 'trabalhador', 'saude.toxicology_test'],
  ['s1202TsvPayroll', 'S-1202', 'folha', 'payroll.payroll_run'],
  ['s1207ScholarshipInternPayroll', 'S-1207', 'folha', 'payroll.payroll_run'],
  ['s1260RuralSale', 'S-1260', 'folha', 'payroll.rural_sale'],
  ['s1270CasualWorkerHire', 'S-1270', 'folha', 'hr.casual_worker_hire'],
  ['s1280ComplementaryInfo', 'S-1280', 'folha', 'payroll.payroll_run'],
  ['s1298Reopen', 'S-1298', 'fechamento', 'payroll.payroll_run'],
  ['s3000Exclusion', 'S-3000', 'exclusao', 'public.esocial_events'],
  ['s2555LaborProcess', 'S-2555', 'trabalhador', 'hr.administrative_process'],
] as const;

describe('SgpEsocialEmittersService', () => {
  it.each(EMITTER_CASES)(
    'builds and persists %s as %s',
    async (method, eventClass, kind, sourceEntityKind) => {
      const events = fakeEventsService();
      const service = new SgpEsocialEmittersService(events as never);

      const result = await service[method]({
        tenantId: TENANT_ID,
        sourceId: SOURCE_ID,
        operation: 'update',
        version: 7,
        data: { code: eventClass, changedAt: '2026-05-10T12:00:00.000Z' },
      });

      expect(events.recordPending).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          kind,
          eventClass,
          payloadHash: stableJsonSha256(events.lastInput.payload),
          sourceRef: expect.objectContaining({
            sourceEntityKind,
            sourceEntityId: SOURCE_ID,
            triggerEvent: eventClass,
          }),
        }),
      );
      expect(events.lastInput.payload).toMatchObject({
        producer: 'sgp',
        eventClass,
        operation: 'update',
        tenantId: TENANT_ID,
        source: { id: SOURCE_ID, version: 7 },
        data: { code: eventClass },
      });
      expect(result).toMatchObject({
        tenantId: TENANT_ID,
        kind,
        eventClass,
        payloadHash: events.lastInput.payloadHash,
        status: 'PENDING',
      });
    },
  );

  it('uses a stable hash so repeated emits reuse the same pending row', async () => {
    const events = fakeEventsService();
    const service = new SgpEsocialEmittersService(events as never);
    const input = {
      tenantId: TENANT_ID,
      sourceId: SOURCE_ID,
      operation: 'create' as const,
      data: { b: 2, a: 1 },
    };

    const first = await service.s2205CadastralChange(input);
    const second = await service.s2205CadastralChange({
      ...input,
      data: { a: 1, b: 2 },
    });

    expect(first.messageId).toBe(second.messageId);
    expect(events.recordPending).toHaveBeenCalledTimes(2);
  });

  it.each(EMITTER_CASES)(
    'keeps the %s golden sample pinned',
    (method, eventClass) => {
      const service = new SgpEsocialEmittersService(
        fakeEventsService() as never,
      );
      const fixture = JSON.parse(
        readFileSync(
          join(
            process.cwd(),
            '..',
            'tests',
            'backend',
            'golden',
            `esocial-${eventClass.toLowerCase().replace('-', '')}`,
            'sample.json',
          ),
          'utf8',
        ),
      );

      expect(
        service.buildPayload(method, {
          tenantId: fixture.tenantId,
          sourceId: fixture.source.id,
          operation: fixture.operation,
          version: fixture.source.version,
          data: fixture.data,
        }),
      ).toEqual(fixture);
    },
  );
});

function fakeEventsService() {
  const rows = new Map<string, Record<string, unknown>>();
  const service = {
    lastInput: undefined as never,
    recordPending: jest.fn((input) => {
      service.lastInput = input;
      const key = [
        input.tenantId,
        input.kind,
        input.eventClass,
        input.payloadHash,
      ].join(':');
      const existing = rows.get(key);
      if (existing) return Promise.resolve(existing);
      const row = {
        messageId: `message-${rows.size + 1}`,
        tenantId: input.tenantId,
        kind: input.kind,
        eventClass: input.eventClass,
        sourceRef: input.sourceRef,
        payload: input.payload,
        payloadHash: input.payloadHash,
        response: null,
        responseHash: null,
        status: 'PENDING',
        attempt: 0,
        maxAttempts: 3,
        error: null,
        createdAt: '2026-05-10T12:00:00.000Z',
        sentAt: null,
        receivedAt: null,
        terminalAt: null,
        actorSub: null,
        actorLogin: null,
        requestId: null,
      };
      rows.set(key, row);
      return Promise.resolve(row);
    }),
  };
  return service;
}
