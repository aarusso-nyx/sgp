import { Logger } from '@nestjs/common';

import {
  WorkerPollRunner,
  WorkerPollScheduleOptions,
  WorkerPollSchedulerService,
} from './worker-poll-scheduler.service';
import { TEST_INSTANT_2026_05_04T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

const workerSchedules: WorkerPollScheduleOptions[] = [
  {
    workerName: 'sgp-integrations-worker',
    pollIntervalEnv: 'INTEGRATIONS_WORKER_POLL_MS',
    pollLimitEnv: 'INTEGRATIONS_WORKER_POLL_LIMIT',
    oneshotEnv: 'INTEGRATIONS_WORKER_ONESHOT',
  },
  {
    workerName: 'sgp-report-worker',
    pollIntervalEnv: 'REPORT_WORKER_POLL_MS',
    pollLimitEnv: 'REPORT_WORKER_POLL_LIMIT',
    oneshotEnv: 'REPORT_WORKER_ONESHOT',
  },
];

describe('WorkerPollSchedulerService', () => {
  const originalEnv = { ...process.env };
  let logSpy: jest.SpiedFunction<Logger['log']>;
  let warnSpy: jest.SpiedFunction<Logger['warn']>;
  let errorSpy: jest.SpiedFunction<Logger['error']>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(TEST_INSTANT_2026_05_04T00_00_00_000Z));
    process.env = { ...originalEnv };
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it.each(workerSchedules)(
    'runs $workerName immediately and then on the configured cadence',
    async (options) => {
      process.env[options.pollIntervalEnv] = '5000';
      process.env[options.pollLimitEnv] = '7';
      const runner = createRunner();
      const scheduler = new WorkerPollSchedulerService(runner, options);

      await scheduler.start();
      expect(runner.backpressureStatus.mock.calls).toHaveLength(1);
      expect(runner.backpressureStatus.mock.calls.at(-1)).toEqual([7]);
      expect(runner.pollOnce.mock.calls).toHaveLength(1);

      jest.advanceTimersByTime(4999);
      await scheduler.handleScheduleTick();
      expect(runner.pollOnce.mock.calls).toHaveLength(1);

      jest.advanceTimersByTime(1);
      await scheduler.handleScheduleTick();
      expect(runner.backpressureStatus.mock.calls).toHaveLength(2);
      expect(runner.backpressureStatus.mock.calls.at(-1)).toEqual([7]);
      expect(runner.pollOnce.mock.calls).toHaveLength(2);
    },
  );

  it('skips polling when backpressure consumes worker capacity', async () => {
    const runner = createRunner();
    runner.backpressureStatus.mockResolvedValue({
      activeClaims: 10,
      capacity: 10,
      limit: 0,
      queueDepth: 5,
      skipped: true,
    });
    const scheduler = new WorkerPollSchedulerService(
      runner,
      workerSchedules[0],
    );

    await scheduler.start();

    expect(runner.pollOnce.mock.calls).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      'poll skipped: queueDepth=5 activeClaims=10 capacity=10',
    );
  });
});

function createRunner(): jest.Mocked<WorkerPollRunner> {
  return {
    backpressureStatus: jest.fn(async () => ({
      activeClaims: 0,
      capacity: 7,
      limit: 7,
      queueDepth: 10,
      skipped: false,
    })),
    pollOnce: jest.fn(async () => ({
      discovered: 1,
      failed: 0,
      processed: 1,
      skipped: 0,
    })),
  };
}
