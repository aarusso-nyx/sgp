import { createHash } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  EsocialEventsService,
  type EsocialEventsRecord,
  type EsocialEventsSourceRef,
} from '../../esocial-events';
import type { EsocialClass, EsocialRelayEventClass } from './contracts';
import type {
  EsocialSgpEventPayload,
  EsocialSgpPayloadSource,
} from './contracts/payloads';

export type SgpEsocialOperation =
  EsocialSgpEventPayload<EsocialRelayEventClass>['operation'];

export type SgpEsocialSourceInput = Readonly<{
  tenantId: string;
  sourceId: string;
  operation?: SgpEsocialOperation | undefined;
  version?: string | number | undefined;
  data?: Readonly<Record<string, unknown>> | undefined;
  sourceRef?: EsocialEventsSourceRef | undefined;
}>;

export type SgpEsocialCurrentTenantInput = Omit<
  SgpEsocialSourceInput,
  'tenantId'
>;

type EventDescriptor = Readonly<{
  eventClass: EsocialRelayEventClass;
  kind: Exclude<EsocialClass, 'submit' | 'retorno' | 'certificado'>;
  source: Omit<EsocialSgpPayloadSource, 'id' | 'version'>;
}>;

const EVENT_DESCRIPTORS = {
  s1000EmployerRegistration: {
    eventClass: 'S-1000',
    kind: 'tabelas',
    source: { schema: 'hr', table: 'company' },
  },
  s1005Establishment: {
    eventClass: 'S-1005',
    kind: 'tabelas',
    source: { schema: 'hr', table: 'work_location' },
  },
  s1010EarningDeduction: {
    eventClass: 'S-1010',
    kind: 'tabelas',
    source: { schema: 'payroll', table: 'payroll_earning_deduction' },
  },
  s1020TaxLocation: {
    eventClass: 'S-1020',
    kind: 'tabelas',
    source: { schema: 'hr', table: 'tax_location' },
  },
  s1030JobPosition: {
    eventClass: 'S-1030',
    kind: 'tabelas',
    source: { schema: 'hr', table: 'job_position' },
  },
  s1040Role: {
    eventClass: 'S-1040',
    kind: 'tabelas',
    source: { schema: 'hr', table: 'role' },
  },
  s1050WorkSchedule: {
    eventClass: 'S-1050',
    kind: 'tabelas',
    source: { schema: 'ponto', table: 'work_schedule' },
  },
  s1060WorkEnvironment: {
    eventClass: 'S-1060',
    kind: 'tabelas',
    source: { schema: 'saude', table: 'work_environment' },
  },
  s1070AdministrativeProcess: {
    eventClass: 'S-1070',
    kind: 'tabelas',
    source: { schema: 'hr', table: 'administrative_process' },
  },
  s2205CadastralChange: {
    eventClass: 'S-2205',
    kind: 'trabalhador',
    source: { schema: 'hr', table: 'cadastral_change_request' },
  },
  s2206ContractChange: {
    eventClass: 'S-2206',
    kind: 'trabalhador',
    source: { schema: 'hr', table: 'employment_link' },
  },
  s2250PriorNotice: {
    eventClass: 'S-2250',
    kind: 'trabalhador',
    source: { schema: 'hr', table: 'termination_notice' },
  },
  s2230Leave: {
    eventClass: 'S-2230',
    kind: 'trabalhador',
    source: { schema: 'hr', table: 'leave_record' },
  },
  s2221ToxicologyTest: {
    eventClass: 'S-2221',
    kind: 'trabalhador',
    source: { schema: 'saude', table: 'toxicology_test' },
  },
  s1202TsvPayroll: {
    eventClass: 'S-1202',
    kind: 'folha',
    source: { schema: 'payroll', table: 'payroll_run' },
  },
  s1207ScholarshipInternPayroll: {
    eventClass: 'S-1207',
    kind: 'folha',
    source: { schema: 'payroll', table: 'payroll_run' },
  },
  s1260RuralSale: {
    eventClass: 'S-1260',
    kind: 'folha',
    source: { schema: 'payroll', table: 'rural_sale' },
  },
  s1270CasualWorkerHire: {
    eventClass: 'S-1270',
    kind: 'folha',
    source: { schema: 'hr', table: 'casual_worker_hire' },
  },
  s1280ComplementaryInfo: {
    eventClass: 'S-1280',
    kind: 'folha',
    source: { schema: 'payroll', table: 'payroll_run' },
  },
  s1298Reopen: {
    eventClass: 'S-1298',
    kind: 'fechamento',
    source: { schema: 'payroll', table: 'payroll_run' },
  },
  s3000Exclusion: {
    eventClass: 'S-3000',
    kind: 'exclusao',
    source: { schema: 'public', table: 'esocial_events' },
  },
  s2555LaborProcess: {
    eventClass: 'S-2555',
    kind: 'trabalhador',
    source: { schema: 'hr', table: 'administrative_process' },
  },
} as const satisfies Record<string, EventDescriptor>;

export type SgpEsocialEmitterName = keyof typeof EVENT_DESCRIPTORS;

@Injectable()
export class SgpEsocialEmittersService {
  constructor(private readonly eventsService: EsocialEventsService) {}

  s1000EmployerRegistration(input: SgpEsocialSourceInput) {
    return this.emit('s1000EmployerRegistration', input);
  }
  s1005Establishment(input: SgpEsocialSourceInput) {
    return this.emit('s1005Establishment', input);
  }
  s1010EarningDeduction(input: SgpEsocialSourceInput) {
    return this.emit('s1010EarningDeduction', input);
  }
  s1020TaxLocation(input: SgpEsocialSourceInput) {
    return this.emit('s1020TaxLocation', input);
  }
  s1030JobPosition(input: SgpEsocialSourceInput) {
    return this.emit('s1030JobPosition', input);
  }
  s1040Role(input: SgpEsocialSourceInput) {
    return this.emit('s1040Role', input);
  }
  s1050WorkSchedule(input: SgpEsocialSourceInput) {
    return this.emit('s1050WorkSchedule', input);
  }
  s1060WorkEnvironment(input: SgpEsocialSourceInput) {
    return this.emit('s1060WorkEnvironment', input);
  }
  s1070AdministrativeProcess(input: SgpEsocialSourceInput) {
    return this.emit('s1070AdministrativeProcess', input);
  }
  s2205CadastralChange(input: SgpEsocialSourceInput) {
    return this.emit('s2205CadastralChange', input);
  }
  s2206ContractChange(input: SgpEsocialSourceInput) {
    return this.emit('s2206ContractChange', input);
  }
  s2250PriorNotice(input: SgpEsocialSourceInput) {
    return this.emit('s2250PriorNotice', input);
  }
  s2230Leave(input: SgpEsocialSourceInput) {
    return this.emit('s2230Leave', input);
  }
  s2221ToxicologyTest(input: SgpEsocialSourceInput) {
    return this.emit('s2221ToxicologyTest', input);
  }
  s1202TsvPayroll(input: SgpEsocialSourceInput) {
    return this.emit('s1202TsvPayroll', input);
  }
  s1207ScholarshipInternPayroll(input: SgpEsocialSourceInput) {
    return this.emit('s1207ScholarshipInternPayroll', input);
  }
  s1260RuralSale(input: SgpEsocialSourceInput) {
    return this.emit('s1260RuralSale', input);
  }
  s1270CasualWorkerHire(input: SgpEsocialSourceInput) {
    return this.emit('s1270CasualWorkerHire', input);
  }
  s1280ComplementaryInfo(input: SgpEsocialSourceInput) {
    return this.emit('s1280ComplementaryInfo', input);
  }
  s1298Reopen(input: SgpEsocialSourceInput) {
    return this.emit('s1298Reopen', input);
  }
  s3000Exclusion(input: SgpEsocialSourceInput) {
    return this.emit('s3000Exclusion', input);
  }
  s2555LaborProcess(input: SgpEsocialSourceInput) {
    return this.emit('s2555LaborProcess', input);
  }

  buildPayload(
    name: SgpEsocialEmitterName,
    input: SgpEsocialSourceInput,
  ): EsocialSgpEventPayload<EsocialRelayEventClass> {
    const descriptor = EVENT_DESCRIPTORS[name];
    return {
      producer: 'sgp',
      eventClass: descriptor.eventClass,
      operation: input.operation ?? 'update',
      tenantId: input.tenantId,
      source: {
        ...descriptor.source,
        id: input.sourceId,
        ...(input.version === undefined ? {} : { version: input.version }),
      },
      data: input.data ?? {},
    };
  }

  async emit(
    name: SgpEsocialEmitterName,
    input: SgpEsocialSourceInput,
  ): Promise<EsocialEventsRecord> {
    const descriptor = EVENT_DESCRIPTORS[name];
    const payload = this.buildPayload(name, input);
    return this.eventsService.recordPending({
      tenantId: input.tenantId,
      kind: descriptor.kind,
      eventClass: descriptor.eventClass,
      sourceRef: {
        sourceEntityKind: `${descriptor.source.schema}.${descriptor.source.table}`,
        sourceEntityId: input.sourceId,
        triggerEvent: descriptor.eventClass,
        ...(input.sourceRef ?? {}),
      },
      payload,
      payloadHash: stableJsonSha256(payload),
    });
  }

  emitForCurrentTenant(
    name: SgpEsocialEmitterName,
    input: SgpEsocialCurrentTenantInput,
  ): Promise<EsocialEventsRecord> {
    return this.emit(name, { ...input, tenantId: this.currentTenantId() });
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return tenantId;
  }
}

export function stableJsonSha256(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}
