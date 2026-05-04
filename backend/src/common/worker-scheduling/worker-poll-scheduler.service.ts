import {
  Inject,
  INestApplicationContext,
  InjectionToken,
  Injectable,
  Logger,
  OnModuleDestroy,
  Provider,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { WorkerBackpressureDecision } from '../observability/worker-backpressure';
import {
  observeWorkerPoll,
  recordSkippedWorkerPoll,
} from '../observability/worker-poll-observability';

export const WORKER_POLL_RUNNER = Symbol('WORKER_POLL_RUNNER');
export const WORKER_POLL_SCHEDULE = Symbol('WORKER_POLL_SCHEDULE');

const SCHEDULE_TICK_MS = 250;

interface WorkerPollSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
}

export interface WorkerPollRunner {
  backpressureStatus(limit: number): Promise<WorkerBackpressureDecision>;
  pollOnce(limit: number): Promise<WorkerPollSummary>;
}

export interface WorkerPollScheduleOptions {
  workerName: string;
  pollIntervalEnv: string;
  pollLimitEnv: string;
  oneshotEnv: string;
  defaultPollIntervalMs?: number;
  defaultPollLimit?: number;
}

@Injectable()
export class WorkerPollSchedulerService implements OnModuleDestroy {
  private readonly logger: Logger;
  private running = false;
  private started = false;
  private nextRunAt = 0;

  constructor(
    @Inject(WORKER_POLL_RUNNER)
    private readonly runner: WorkerPollRunner,
    @Inject(WORKER_POLL_SCHEDULE)
    private readonly options: WorkerPollScheduleOptions,
  ) {
    this.logger = new Logger(options.workerName);
  }

  get oneshot(): boolean {
    return ['1', 'true', 'yes', 'on'].includes(
      (process.env[this.options.oneshotEnv] ?? '').toLowerCase(),
    );
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.runScheduled(Date.now(), true);
  }

  stop(): void {
    this.started = false;
  }

  onModuleDestroy(): void {
    this.stop();
  }

  async runOnce(): Promise<void> {
    const backpressure = await this.runner.backpressureStatus(this.pollLimit());
    if (backpressure.skipped) {
      recordSkippedWorkerPoll(this.options.workerName);
      this.logger.warn(
        `poll skipped: queueDepth=${backpressure.queueDepth} activeClaims=${backpressure.activeClaims} capacity=${backpressure.capacity}`,
      );
      return;
    }

    const summary = await observeWorkerPoll(this.options.workerName, () =>
      this.runner.pollOnce(backpressure.limit),
    );
    this.logger.log(
      `poll complete: discovered=${summary.discovered} processed=${summary.processed} failed=${summary.failed} skipped=${summary.skipped}`,
    );
  }

  @Interval(SCHEDULE_TICK_MS)
  async handleScheduleTick(): Promise<void> {
    if (!this.started || this.oneshot) return;
    await this.runScheduled(Date.now(), false);
  }

  private async runScheduled(
    now: number,
    throwOnError: boolean,
  ): Promise<void> {
    if (this.running || now < this.nextRunAt) return;
    this.running = true;
    this.nextRunAt = now + this.pollIntervalMs();
    try {
      await this.runOnce();
    } catch (error) {
      if (throwOnError) throw error;
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(message);
    } finally {
      this.running = false;
    }
  }

  private pollIntervalMs(): number {
    return this.positiveInteger(
      process.env[this.options.pollIntervalEnv],
      this.options.defaultPollIntervalMs ?? 5000,
    );
  }

  private pollLimit(): number {
    return this.positiveInteger(
      process.env[this.options.pollLimitEnv],
      this.options.defaultPollLimit ?? 10,
    );
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  }
}

export function createWorkerPollSchedulerProviders(
  workerToken: InjectionToken<WorkerPollRunner>,
  options: WorkerPollScheduleOptions,
): Provider[] {
  return [
    { provide: WORKER_POLL_RUNNER, useExisting: workerToken },
    { provide: WORKER_POLL_SCHEDULE, useValue: options },
    WorkerPollSchedulerService,
  ];
}

export function registerWorkerShutdown(
  app: INestApplicationContext,
  scheduler: WorkerPollSchedulerService,
  cleanup: () => Promise<void> | void = () => undefined,
): void {
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    scheduler.stop();
    await cleanup();
    await app.close();
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}
