import { domainError } from '../../common/errors/domain-error';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatDateOnlyUtc(value: Date | string): string {
  return DATE_FORMATTER.format(new Date(value));
}

export function formatInstantIso(value: Date | string): string {
  return new Date(value).toISOString();
}

export function assertTenantTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      `Invalid tenant time zone: ${timeZone}`,
    );
  }
}
