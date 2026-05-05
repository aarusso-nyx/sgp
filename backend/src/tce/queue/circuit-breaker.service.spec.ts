import { TceCircuitBreakerService } from './circuit-breaker.service';
import {
  TEST_INSTANT_2026_05_02T10_00_00_000Z,
  TEST_INSTANT_2026_05_02T10_02_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

describe('TceCircuitBreakerService', () => {
  it('opens after configured failures and blocks during cooldown', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ state: 'CLOSED' }])
      .mockResolvedValueOnce([{ state: 'OPEN' }])
      .mockResolvedValueOnce([
        {
          adapter_id: 'audesp-sp',
          endpoint_url: 'stub://audesp-sp',
          state: 'OPEN',
          failure_count: 3,
          opened_at: new Date(),
          last_failure_at: new Date(),
          last_success_at: null,
        },
      ]);
    const service = new TceCircuitBreakerService(
      { query } as never,
      {
        get: (key: string) =>
          key === 'TCE_CIRCUIT_FAILURE_THRESHOLD' ? '3' : '60000',
      } as never,
    );

    await expect(
      service.recordFailure('audesp-sp', 'stub://audesp-sp'),
    ).resolves.toBe('CLOSED');
    await expect(
      service.recordFailure('audesp-sp', 'stub://audesp-sp'),
    ).resolves.toBe('OPEN');
    await expect(
      service.assertCanSend('audesp-sp', 'stub://audesp-sp'),
    ).rejects.toThrow('circuit is open');
  });

  it('moves open circuit to half-open after cooldown and closes on success', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          adapter_id: 'audesp-sp',
          endpoint_url: 'stub://audesp-sp',
          state: 'OPEN',
          failure_count: 3,
          opened_at: new Date(TEST_INSTANT_2026_05_02T10_00_00_000Z),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const now = jest
      .spyOn(Date, 'now')
      .mockReturnValue(
        new Date(TEST_INSTANT_2026_05_02T10_02_00_000Z).getTime(),
      );
    const service = new TceCircuitBreakerService(
      { query } as never,
      { get: () => '60000' } as never,
    );

    await expect(
      service.assertCanSend('audesp-sp', 'stub://audesp-sp'),
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("state = 'HALF_OPEN'"),
      ['audesp-sp', 'stub://audesp-sp'],
    );

    await service.recordSuccess('audesp-sp', 'stub://audesp-sp');
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('last_success_at'),
      ['audesp-sp', 'stub://audesp-sp'],
    );
    now.mockRestore();
  });
});
