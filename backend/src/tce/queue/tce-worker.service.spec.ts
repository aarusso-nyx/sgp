import { TceCircuitBreakerService } from './circuit-breaker.service';
import { TceRetryStrategyService } from './retry-strategy.service';
import { TceWorkerService } from './tce-worker.service';
import { TEST_INSTANT_2026_05_04T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('TceWorkerService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(TEST_INSTANT_2026_05_04T00_00_00_000Z));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it('claims eligible jobs with FOR UPDATE SKIP LOCKED and marks success', async () => {
    const database = new FakeWorkerDatabase([
      {
        id: '00000000-0000-4000-8000-000000000074',
        tenant_id: '00000000-0000-0000-0000-000000000100',
        submission_id: '00000000-0000-4000-8000-000000000075',
        adapter_id: 'audesp-sp',
        endpoint_url: 'stub://audesp-sp',
        attempts: 0,
        max_attempts: 8,
      },
    ]);
    const service = new TceWorkerService(
      database as never,
      { submit: jest.fn().mockResolvedValue({ id: 'submission' }) } as never,
      new TceRetryStrategyService(),
      {
        assertCanSend: jest.fn(),
        recordSuccess: jest.fn(),
      } as unknown as TceCircuitBreakerService,
      { get: () => undefined } as never,
    );

    const result = await service.runOnce(1);

    expect(result).toEqual([
      {
        queueId: '00000000-0000-4000-8000-000000000074',
        status: 'SUCCEEDED',
        attempts: 1,
      },
    ]);
    expect(database.claimSql).toContain('FOR UPDATE SKIP LOCKED');
    expect(database.updatedStatus).toBe('SUCCEEDED');
  });

  it('does not reclaim jobs already locked by another node', async () => {
    const database = new FakeWorkerDatabase([]);
    const service = new TceWorkerService(
      database as never,
      { submit: jest.fn() } as never,
      new TceRetryStrategyService(),
      {
        assertCanSend: jest.fn(),
        recordSuccess: jest.fn(),
      } as unknown as TceCircuitBreakerService,
      { get: () => undefined } as never,
    );

    await expect(service.runOnce(1)).resolves.toEqual([]);
    expect(database.claimSql).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('uses the Nest schedule tick without overlapping TCE queue runs', async () => {
    process.env.TCE_WORKER_POLL_MS = '5000';
    const database = new FakeWorkerDatabase([]);
    let releaseRun: (() => void) | undefined;
    const service = new TceWorkerService(
      database as never,
      { submit: jest.fn() } as never,
      new TceRetryStrategyService(),
      {
        assertCanSend: jest.fn(),
        recordSuccess: jest.fn(),
      } as unknown as TceCircuitBreakerService,
      {
        get: (key: string) =>
          key === 'TCE_WORKER_ENABLED' ? 'true' : process.env[key],
      } as never,
    );
    const runSpy = jest.spyOn(service, 'runOnce').mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRun = () => resolve([]);
        }),
    );

    service.onModuleInit();
    expect(runSpy).toHaveBeenCalledTimes(1);

    await service.handleScheduleTick();
    expect(runSpy).toHaveBeenCalledTimes(1);

    releaseRun?.();
    await Promise.resolve();

    jest.advanceTimersByTime(4999);
    await service.handleScheduleTick();
    expect(runSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    const secondTick = service.handleScheduleTick();
    expect(runSpy).toHaveBeenCalledTimes(2);
    releaseRun?.();
    await secondTick;
  });
});

class FakeWorkerDatabase {
  claimSql = '';
  updatedStatus = '';

  constructor(private readonly rows: unknown[]) {}

  async query<T>(sql: string): Promise<T[]> {
    if (
      sql.includes('UPDATE tce.submission_queue queue') &&
      sql.includes('claimed')
    ) {
      this.claimSql = sql;
      return this.rows as T[];
    }
    return [] as T[];
  }

  async transaction<T>(
    callback: (client: {
      query: (sql: string) => Promise<unknown>;
    }) => Promise<T>,
  ) {
    return callback({
      query: async (sql: string) => {
        if (sql.includes("status = 'SUCCEEDED'")) {
          this.updatedStatus = 'SUCCEEDED';
        }
        return { rows: [] };
      },
    });
  }
}
