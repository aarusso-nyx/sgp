import { Injectable } from '@nestjs/common';

export const LAI_INITIAL_RESPONSE_DAYS = 20;
export const LAI_EXTENSION_DAYS = 10;

export type LaiSlaStatus = 'OPEN' | 'DUE_TODAY' | 'OVERDUE' | 'FINISHED';

export interface LaiSlaSummary {
  dueAt: Date;
  extendedDueAt?: Date | undefined;
  effectiveDueAt: Date;
  remainingDays: number;
  status: LaiSlaStatus;
}

@Injectable()
export class LaiSlaService {
  initialDueAt(submittedAt: Date): Date {
    return this.addCalendarDays(submittedAt, LAI_INITIAL_RESPONSE_DAYS);
  }

  extendedDueAt(dueAt: Date): Date {
    return this.addCalendarDays(dueAt, LAI_EXTENSION_DAYS);
  }

  summarize(input: {
    submittedAt: Date;
    dueAt?: Date | undefined;
    extendedDueAt?: Date | null | undefined;
    finishedAt?: Date | null | undefined;
    now?: Date | undefined;
  }): LaiSlaSummary {
    const dueAt = input.dueAt ?? this.initialDueAt(input.submittedAt);
    const effectiveDueAt = input.extendedDueAt ?? dueAt;
    const now = input.now ?? new Date();
    const remainingDays = Math.ceil(
      (effectiveDueAt.getTime() - now.getTime()) / 86_400_000,
    );

    return {
      dueAt,
      extendedDueAt: input.extendedDueAt ?? undefined,
      effectiveDueAt,
      remainingDays,
      status: input.finishedAt
        ? 'FINISHED'
        : remainingDays < 0
          ? 'OVERDUE'
          : remainingDays === 0
            ? 'DUE_TODAY'
            : 'OPEN',
    };
  }

  private addCalendarDays(value: Date, days: number): Date {
    const result = new Date(value.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }
}
