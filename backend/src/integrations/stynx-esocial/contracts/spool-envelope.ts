import type { EsocialClass } from './kinds';

export type EsocialSpoolStatus =
  | 'PENDING'
  | 'SENT'
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'RETRY'
  | 'DLQ';

export type EsocialSpoolStatusTransition = Readonly<{
  from?: EsocialSpoolStatus;
  to: EsocialSpoolStatus;
}>;

export type SpoolUpdateEnvelope = Readonly<{
  message_id: string;
  tenant_id: string;
  kind: EsocialClass;
  status_transition: EsocialSpoolStatusTransition;
  response_payload?: unknown;
  response_hash?: string;
  error?: {
    code?: string;
    message: string;
    details?: unknown;
  };
  occurred_at: string;
}>;
