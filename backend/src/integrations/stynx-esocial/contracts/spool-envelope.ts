import type { EsocialClass } from './kinds';

export type EsocialEventsStatus =
  | 'PENDING'
  | 'SENT'
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'RETRY'
  | 'DLQ';

export type EsocialEventsStatusTransition = Readonly<{
  from?: EsocialEventsStatus;
  to: EsocialEventsStatus;
}>;

export type SpoolUpdateEnvelope = Readonly<{
  message_id: string;
  tenant_id: string;
  kind: EsocialClass;
  status_transition: EsocialEventsStatusTransition;
  response_payload?: unknown;
  response_hash?: string;
  error?: {
    code?: string;
    message: string;
    details?: unknown;
  };
  occurred_at: string;
}>;
