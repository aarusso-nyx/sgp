import type {
  EsocialClass,
  EsocialEventsStatus,
} from '../integrations/stynx-esocial/contracts';
import type {
  EsocialEventsError,
  EsocialEventsSourceRef,
} from './esocial-events.types';

export type RecordPendingInput = Readonly<{
  tenantId: string;
  kind: EsocialClass;
  eventClass: string;
  sourceRef?: EsocialEventsSourceRef;
  payload: unknown;
  payloadHash?: string;
  actorSub?: string;
  actorLogin?: string;
  requestId?: string;
  messageId?: string;
  maxAttempts?: number;
}>;

export type RecordSentInput = Readonly<{
  tenantId: string;
  messageId: string;
  attempt?: number;
}>;

export type RecordResponseInput = Readonly<{
  tenantId: string;
  messageId: string;
  status?: Extract<EsocialEventsStatus, 'RECEIVED' | 'ACCEPTED' | 'REJECTED'>;
  response: unknown;
  responseHash?: string;
}>;

export type RecordErrorInput = Readonly<{
  tenantId: string;
  messageId: string;
  status: Extract<EsocialEventsStatus, 'RETRY' | 'REJECTED' | 'DLQ'>;
  error: EsocialEventsError;
  response?: unknown;
  responseHash?: string;
}>;
