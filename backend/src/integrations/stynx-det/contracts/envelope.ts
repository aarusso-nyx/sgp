import type { DetEnvelopeFamily, DetMessageStatus } from './kinds';

export type DetEnvelopeBase = Readonly<{
  version: 'v1';
  family: DetEnvelopeFamily;
  request_id: string;
  correlation_id?: string | undefined;
  idempotency_key: string;
  tenant_id: string;
  created_at: string;
}>;

export type DetInboxUpdateEnvelope = DetEnvelopeBase &
  Readonly<{
    family: 'inbox';
    message: {
      external_message_id: string;
      subject: string;
      sender?: string | undefined;
      received_at: string;
      due_at?: string | undefined;
      status: DetMessageStatus;
      payload?: unknown;
    };
  }>;

export type DetAcknowledgementRequestEnvelope = DetEnvelopeBase &
  Readonly<{
    family: 'acknowledgement';
    message_id: string;
    external_message_id: string;
    requested_by: string;
    requested_at: string;
    note?: string | undefined;
  }>;

export type DetAuditEnvelope = DetEnvelopeBase &
  Readonly<{
    family: 'audit';
    action: string;
    target: {
      type: string;
      id?: string | undefined;
    };
    actor_id?: string | undefined;
    before?: unknown;
    after?: unknown;
    occurred_at: string;
  }>;

export type DetEnvelope =
  DetInboxUpdateEnvelope | DetAcknowledgementRequestEnvelope | DetAuditEnvelope;
