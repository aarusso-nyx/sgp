import type { EsocialClass } from '../kinds';

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
