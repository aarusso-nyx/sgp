import { TceRetryStrategyService } from './retry-strategy.service';
import { TEST_INSTANT_2026_05_02T12_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('TceRetryStrategyService', () => {
  const service = new TceRetryStrategyService();

  it('classifies timeout, transient, validation, and definitive errors', () => {
    expect(service.classify({ code: 'ETIMEDOUT' })).toMatchObject({
      errorKind: 'TIMEOUT',
      outcome: 'TIMEOUT',
      transient: true,
      countsForCircuit: true,
    });
    expect(
      service.classify({
        message: 'Request failed',
        response: { status: 503, data: { fault: 'unavailable' } },
      }),
    ).toMatchObject({
      errorKind: 'TRANSIENT',
      outcome: 'TRANSIENT_FAIL',
      transient: true,
    });
    expect(
      service.classify({ message: 'validation invalid payload' }),
    ).toMatchObject({
      errorKind: 'VALIDATION',
      outcome: 'DEFINITIVE_FAIL',
      transient: false,
    });
    expect(
      service.classify({ message: 'layout rejected permanently' }),
    ).toMatchObject({
      errorKind: 'DEFINITIVE',
      transient: false,
      countsForCircuit: false,
    });
  });

  it('computes exponential retry delay with bounded jitter', () => {
    const now = new Date(TEST_INSTANT_2026_05_02T12_00_00_000Z);

    expect(service.nextAttemptAt(1, now, 0).toISOString()).toBe(
      '2026-05-02T12:00:01.000Z',
    );
    expect(service.nextAttemptAt(3, now, 0.5).toISOString()).toBe(
      '2026-05-02T12:00:04.400Z',
    );
  });
});
