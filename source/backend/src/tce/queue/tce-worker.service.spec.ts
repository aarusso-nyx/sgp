import { TceCircuitBreakerService } from './circuit-breaker.service';
import { TceRetryStrategyService } from './retry-strategy.service';
import { TceWorkerService } from './tce-worker.service';

describe('TceWorkerService', () => {
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
