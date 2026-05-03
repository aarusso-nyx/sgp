import { BadRequestException } from '@nestjs/common';

export const LAI_REQUEST_STATUSES = [
  'RECEIVED',
  'IN_REVIEW',
  'AWAITING_CLARIFICATION',
  'EXTENDED',
  'ANSWERED',
  'DENIED',
  'CLOSED',
] as const;

export type LaiRequestStatus = (typeof LAI_REQUEST_STATUSES)[number];

const TRANSITIONS: Record<LaiRequestStatus, readonly LaiRequestStatus[]> = {
  RECEIVED: [
    'IN_REVIEW',
    'AWAITING_CLARIFICATION',
    'EXTENDED',
    'ANSWERED',
    'DENIED',
    'CLOSED',
  ],
  IN_REVIEW: ['AWAITING_CLARIFICATION', 'EXTENDED', 'ANSWERED', 'DENIED'],
  AWAITING_CLARIFICATION: ['IN_REVIEW', 'CLOSED'],
  EXTENDED: ['ANSWERED', 'DENIED', 'CLOSED'],
  ANSWERED: ['CLOSED'],
  DENIED: ['CLOSED'],
  CLOSED: [],
};

const STATUS_SET = new Set<string>(LAI_REQUEST_STATUSES);

export class LaiRequestStateMachine {
  static parse(value: string): LaiRequestStatus {
    if (STATUS_SET.has(value)) return value as LaiRequestStatus;
    throw new BadRequestException(`Invalid LAI request status: ${value}`);
  }

  static nextStatuses(status: LaiRequestStatus): readonly LaiRequestStatus[] {
    return TRANSITIONS[status];
  }

  static assertTransition(from: LaiRequestStatus, to: LaiRequestStatus): void {
    if (TRANSITIONS[from].includes(to)) return;
    throw new BadRequestException(
      `Invalid LAI request transition from ${from} to ${to}`,
    );
  }

  static isTerminal(status: LaiRequestStatus): boolean {
    return status === 'CLOSED';
  }
}
