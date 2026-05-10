import type { EsocialClass } from '../kinds';
import type { EsocialRelayEventClass } from '../kinds';

export type EsocialClassRequestPayload<TClass extends EsocialClass> = Readonly<{
  class: TClass;
  tenantId: string;
  correlationId?: string | undefined;
  idempotencyKey?: string | undefined;
  payload: unknown;
}>;

export type EsocialClassResponsePayload<TClass extends EsocialClass> =
  Readonly<{
    class: TClass;
    tenantId: string;
    correlationId?: string | undefined;
    status: 'ACCEPTED' | 'REJECTED' | 'RETRY' | 'DLQ';
    payload?: unknown;
    error?: {
      code?: string | undefined;
      message: string;
      details?: unknown;
    };
  }>;

export type EsocialSgpPayloadSource = Readonly<{
  schema: string;
  table: string;
  id: string;
  version?: string | number | undefined;
}>;

export type EsocialSgpEventPayload<
  TEventClass extends EsocialRelayEventClass,
  TData extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, unknown>
  >,
> = Readonly<{
  producer: 'sgp';
  eventClass: TEventClass;
  operation: 'bootstrap' | 'create' | 'update' | 'close' | 'reopen' | 'delete';
  tenantId: string;
  source: EsocialSgpPayloadSource;
  data: TData;
}>;
