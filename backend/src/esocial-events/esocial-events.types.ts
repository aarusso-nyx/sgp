import type { QueryResultRow } from 'pg';

import type {
  EsocialClass,
  EsocialEventsStatus,
} from '../integrations/stynx-esocial/contracts';

export type EsocialEventsKind = EsocialClass;

export type EsocialEventsSourceRef = Readonly<Record<string, unknown>>;
export type EsocialEventsJson =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<EsocialEventsJson>
  | { readonly [key: string]: EsocialEventsJson };

export type EsocialEventsError = Readonly<{
  code?: string | undefined;
  message: string;
  details?: unknown;
}>;

export type EsocialEventsRecord = Readonly<{
  messageId: string;
  tenantId: string;
  kind: EsocialEventsKind;
  eventClass: string;
  sourceRef: EsocialEventsSourceRef;
  payload: unknown;
  payloadHash: string;
  response: EsocialEventsJson;
  responseHash: string | null;
  status: EsocialEventsStatus;
  attempt: number;
  maxAttempts: number;
  error: EsocialEventsError | null;
  createdAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  terminalAt: string | null;
  actorSub: string | null;
  actorLogin: string | null;
  requestId: string | null;
}>;

export type EsocialEventsRow = QueryResultRow & {
  message_id: string;
  tenant_id: string;
  kind: EsocialEventsKind;
  event_class: string;
  source_ref: EsocialEventsSourceRef;
  payload: unknown;
  payload_hash: string;
  response: EsocialEventsJson;
  response_hash: string | null;
  status: EsocialEventsStatus;
  attempt: number;
  max_attempts: number;
  error: EsocialEventsError | null;
  tstamp_created: Date | string;
  tstamp_sent: Date | string | null;
  tstamp_recv: Date | string | null;
  tstamp_terminal: Date | string | null;
  actor_sub: string | null;
  actor_login: string | null;
  request_id: string | null;
};

export type EsocialEventsListFilters = Readonly<{
  status?: EsocialEventsStatus | undefined;
  kind?: EsocialEventsKind | undefined;
  limit?: number | undefined;
}>;
