export const DET_MESSAGE_STATUSES = [
  'UNREAD',
  'READ',
  'ACK_REQUESTED',
  'ACKNOWLEDGED',
  'ARCHIVED',
  'ERROR',
] as const;

export type DetMessageStatus = (typeof DET_MESSAGE_STATUSES)[number];

export const DET_ENVELOPE_FAMILIES = [
  'inbox',
  'acknowledgement',
  'audit',
] as const;

export type DetEnvelopeFamily = (typeof DET_ENVELOPE_FAMILIES)[number];
