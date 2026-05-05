import type {
  EsocialClass,
  EsocialSpoolStatus,
} from '../integrations/stynx-esocial/contracts';
import type {
  EsocialSpoolError,
  EsocialSpoolSourceRef,
} from './esocial-spool.types';

export type RecordPendingInput = Readonly<{
  tenantId: string;
  kind: EsocialClass;
  eventClass: string;
  sourceRef?: EsocialSpoolSourceRef;
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
  status?: Extract<EsocialSpoolStatus, 'RECEIVED' | 'ACCEPTED' | 'REJECTED'>;
  response: unknown;
  responseHash?: string;
}>;

export type RecordErrorInput = Readonly<{
  tenantId: string;
  messageId: string;
  status: Extract<EsocialSpoolStatus, 'RETRY' | 'REJECTED' | 'DLQ'>;
  error: EsocialSpoolError;
  response?: unknown;
  responseHash?: string;
}>;
