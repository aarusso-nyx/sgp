import type { QueryResultRow } from 'pg';

import type {
  EsocialClass,
  EsocialSpoolStatus,
} from '../integrations/stynx-esocial/contracts';

export type EsocialSpoolKind = EsocialClass;

export type EsocialSpoolSourceRef = Readonly<Record<string, unknown>>;
export type EsocialSpoolJson =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<EsocialSpoolJson>
  | { readonly [key: string]: EsocialSpoolJson };

export type EsocialSpoolError = Readonly<{
  code?: string;
  message: string;
  details?: unknown;
}>;

export type EsocialSpoolRecord = Readonly<{
  messageId: string;
  tenantId: string;
  kind: EsocialSpoolKind;
  eventClass: string;
  sourceRef: EsocialSpoolSourceRef;
  payload: unknown;
  payloadHash: string;
  response: EsocialSpoolJson;
  responseHash: string | null;
  status: EsocialSpoolStatus;
  attempt: number;
  maxAttempts: number;
  error: EsocialSpoolError | null;
  createdAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  terminalAt: string | null;
  actorSub: string | null;
  actorLogin: string | null;
  requestId: string | null;
}>;

export type EsocialSpoolRow = QueryResultRow & {
  message_id: string;
  tenant_id: string;
  kind: EsocialSpoolKind;
  event_class: string;
  source_ref: EsocialSpoolSourceRef;
  payload: unknown;
  payload_hash: string;
  response: EsocialSpoolJson;
  response_hash: string | null;
  status: EsocialSpoolStatus;
  attempt: number;
  max_attempts: number;
  error: EsocialSpoolError | null;
  tstamp_created: Date | string;
  tstamp_sent: Date | string | null;
  tstamp_recv: Date | string | null;
  tstamp_terminal: Date | string | null;
  actor_sub: string | null;
  actor_login: string | null;
  request_id: string | null;
};

export type EsocialSpoolListFilters = Readonly<{
  status?: EsocialSpoolStatus;
  kind?: EsocialSpoolKind;
  limit?: number;
}>;
