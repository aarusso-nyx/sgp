import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { AudespSpSubmissionService } from '../adapters/audesp-sp/audesp-sp.submission.service';
import { TceCircuitBreakerService } from './circuit-breaker.service';
import {
  TceRetryDecision,
  TceRetryStrategyService,
} from './retry-strategy.service';
import {
  TceQueueJobDto,
  mapQueueJob,
  queueJobColumns,
  queueJobFromClause,
} from './queue.types';

interface ClaimedQueueRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  submission_id: string;
  adapter_id: string;
  endpoint_url: string | null;
  attempts: number;
  max_attempts: number;
}

export interface TceWorkerRunResult {
  queueId: string;
  status: 'SUCCEEDED' | 'RETRY' | 'FAILED' | 'DEAD_LETTER';
  attempts: number;
}

@Injectable()
export class TceWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TceWorkerService.name);
  private running = false;
  private started = false;
  private nextRunAt = 0;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly audespSubmissions: AudespSpSubmissionService,
    private readonly retryStrategy: TceRetryStrategyService,
    private readonly circuitBreaker: TceCircuitBreakerService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.started =
      this.configService.get<string>('TCE_WORKER_ENABLED') === 'true';
    if (this.started) void this.runScheduled(Date.now());
  }

  onModuleDestroy(): void {
    this.started = false;
  }

  @Interval(250)
  async handleScheduleTick(): Promise<void> {
    if (!this.started) return;
    await this.runScheduled(Date.now());
  }

  async runOnce(limit = this.claimLimit()): Promise<TceWorkerRunResult[]> {
    return RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'tce-worker' },
      async () => {
        const jobs = await this.claimJobs(limit);
        const results: TceWorkerRunResult[] = [];
        for (const job of jobs) {
          results.push(await this.processJob(job));
        }
        return results;
      },
    );
  }

  async listJobs(filters: {
    adapter?: string;
    stateCode?: string;
    status?: string;
    competence?: string;
  }): Promise<TceQueueJobDto[]> {
    const values: unknown[] = [];
    const where: string[] = [];
    if (filters.adapter) {
      values.push(filters.adapter);
      where.push(`queue.adapter_id = $${values.length}`);
    }
    if (filters.stateCode) {
      values.push(filters.stateCode);
      where.push(`state.code = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      where.push(
        `queue.status = $${values.length}::tce.submission_queue_status`,
      );
    }
    if (filters.competence) {
      const [year, month] = filters.competence.split('-').map(Number);
      if (Number.isInteger(year) && Number.isInteger(month)) {
        values.push(year);
        where.push(`submission.competence_year = $${values.length}::int`);
        values.push(month);
        where.push(`submission.competence_month = $${values.length}::int`);
      }
    }

    const rows = await this.databaseService.query(
      `
      SELECT ${queueJobColumns()}
      FROM ${queueJobFromClause()}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY queue.created_at DESC
      LIMIT 200
      `,
      values,
    );
    return rows.map(mapQueueJob);
  }

  async getJob(
    id: string,
  ): Promise<TceQueueJobDto & { attemptsHistory: unknown[] }> {
    const rows = await this.databaseService.query(
      `
      SELECT ${queueJobColumns()}
      FROM ${queueJobFromClause()}
      WHERE queue.id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new ServiceUnavailableException(
        'TCE queue job is not available in the current tenant',
      );
    }
    const attempts = await this.databaseService.query(
      `
      SELECT
        id::text,
        queue_id::text,
        tenant_id::text,
        attempt_number,
        started_at,
        finished_at,
        outcome::text AS outcome,
        error_payload
      FROM tce.submission_attempt
      WHERE queue_id = $1::uuid
      ORDER BY attempt_number DESC
      `,
      [id],
    );
    return {
      ...mapQueueJob(rows[0]),
      attemptsHistory: attempts,
    };
  }

  async replay(id: string): Promise<TceQueueJobDto> {
    const rows = await this.databaseService.query<Pick<ClaimedQueueRow, 'id'>>(
      `
      UPDATE tce.submission_queue queue
      SET status = 'PENDING'::tce.submission_queue_status,
          next_attempt_at = now(),
          locked_by = NULL,
          locked_at = NULL,
          last_error_kind = NULL,
          last_error_payload = NULL
      WHERE queue.id = $1::uuid
        AND queue.status IN (
          'FAILED'::tce.submission_queue_status,
          'RETRY'::tce.submission_queue_status,
          'DEAD_LETTER'::tce.submission_queue_status
        )
      RETURNING queue.id::text
      `,
      [id],
    );
    if (!rows[0]) {
      throw new ServiceUnavailableException(
        'TCE queue job cannot be replayed from its current state',
      );
    }
    const queueRows = await this.databaseService.query(
      `
      SELECT ${queueJobColumns()}
      FROM ${queueJobFromClause()}
      WHERE queue.id = $1::uuid
      `,
      [rows[0].id],
    );
    return mapQueueJob(queueRows[0]!);
  }

  private async claimJobs(limit: number): Promise<ClaimedQueueRow[]> {
    const workerId = this.workerId();
    const rows = await this.databaseService.query<ClaimedQueueRow>(
      `
      WITH claimed AS (
        SELECT id
        FROM tce.submission_queue
        WHERE status IN (
            'PENDING'::tce.submission_queue_status,
            'RETRY'::tce.submission_queue_status
          )
          AND (next_attempt_at IS NULL OR next_attempt_at <= now())
        ORDER BY next_attempt_at NULLS FIRST, created_at ASC
        LIMIT $1::int
        FOR UPDATE SKIP LOCKED
      )
      UPDATE tce.submission_queue queue
      SET status = 'LOCKED'::tce.submission_queue_status,
          locked_by = $2,
          locked_at = now()
      FROM claimed
      WHERE queue.id = claimed.id
      RETURNING
        queue.id::text,
        queue.tenant_id::text,
        queue.submission_id::text,
        queue.adapter_id,
        queue.endpoint_url,
        queue.attempts,
        queue.max_attempts
      `,
      [Math.max(1, limit), workerId],
    );
    return rows;
  }

  private async processJob(job: ClaimedQueueRow): Promise<TceWorkerRunResult> {
    try {
      await this.circuitBreaker.assertCanSend(job.adapter_id, job.endpoint_url);
    } catch (error) {
      const decision = this.retryStrategy.classify(error);
      return this.markCircuitOpen(job, decision);
    }

    try {
      await this.dispatch(job);
      await this.markSucceeded(job);
      await this.circuitBreaker.recordSuccess(job.adapter_id, job.endpoint_url);
      return {
        queueId: job.id,
        status: 'SUCCEEDED',
        attempts: job.attempts + 1,
      };
    } catch (error) {
      const decision = this.retryStrategy.classify(error);
      if (decision.countsForCircuit) {
        await this.circuitBreaker.recordFailure(
          job.adapter_id,
          job.endpoint_url,
        );
      }
      return this.markFailed(job, decision);
    }
  }

  private async dispatch(job: ClaimedQueueRow): Promise<void> {
    if (job.adapter_id === 'audesp-sp') {
      await this.audespSubmissions.submit(job.submission_id, false);
      return;
    }
    throw new Error(
      `Unsupported TCE adapter for queue dispatch: ${job.adapter_id}`,
    );
  }

  private async markSucceeded(job: ClaimedQueueRow): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE tce.submission_queue
        SET status = 'SUCCEEDED'::tce.submission_queue_status,
            attempts = attempts + 1,
            next_attempt_at = NULL,
            locked_by = NULL,
            locked_at = NULL,
            last_error_kind = NULL,
            last_error_payload = NULL
        WHERE id = $1::uuid
        `,
        [job.id],
      );
      await client.query(
        `
        INSERT INTO tce.submission_attempt (
          queue_id,
          tenant_id,
          attempt_number,
          finished_at,
          outcome
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::int,
          now(),
          'SUCCESS'::tce.submission_attempt_outcome
        )
        `,
        [job.id, job.tenant_id, job.attempts + 1],
      );
    });
  }

  private async markCircuitOpen(
    job: ClaimedQueueRow,
    decision: TceRetryDecision,
  ): Promise<TceWorkerRunResult> {
    const nextAttemptAt = this.retryStrategy
      .nextAttemptAt(job.attempts + 1)
      .toISOString();
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE tce.submission_queue
        SET status = 'RETRY'::tce.submission_queue_status,
            next_attempt_at = $2::timestamptz,
            locked_by = NULL,
            locked_at = NULL,
            last_error_kind = 'TRANSIENT'::tce.submission_error_kind,
            last_error_payload = $3::jsonb
        WHERE id = $1::uuid
        `,
        [job.id, nextAttemptAt, JSON.stringify(decision.payload)],
      );
      await this.insertAttempt(client, job, 'CIRCUIT_OPEN', decision.payload);
    });
    return { queueId: job.id, status: 'RETRY', attempts: job.attempts };
  }

  private async markFailed(
    job: ClaimedQueueRow,
    decision: TceRetryDecision,
  ): Promise<TceWorkerRunResult> {
    const nextAttempts = job.attempts + 1;
    const exceeded = nextAttempts >= job.max_attempts;
    const status = decision.transient
      ? exceeded
        ? 'DEAD_LETTER'
        : 'RETRY'
      : 'FAILED';
    const nextAttemptAt =
      decision.transient && !exceeded
        ? this.retryStrategy.nextAttemptAt(nextAttempts).toISOString()
        : null;
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE tce.submission_queue
        SET status = $2::tce.submission_queue_status,
            attempts = attempts + 1,
            next_attempt_at = $3::timestamptz,
            locked_by = NULL,
            locked_at = NULL,
            last_error_kind = $4::tce.submission_error_kind,
            last_error_payload = $5::jsonb
        WHERE id = $1::uuid
        `,
        [
          job.id,
          status,
          nextAttemptAt,
          decision.errorKind,
          JSON.stringify(decision.payload),
        ],
      );
      await this.insertAttempt(client, job, decision.outcome, decision.payload);
    });
    return { queueId: job.id, status, attempts: nextAttempts };
  }

  private async insertAttempt(
    client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
    job: ClaimedQueueRow,
    outcome: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO tce.submission_attempt (
        queue_id,
        tenant_id,
        attempt_number,
        finished_at,
        outcome,
        error_payload
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::int,
        now(),
        $4::tce.submission_attempt_outcome,
        $5::jsonb
      )
      `,
      [
        job.id,
        job.tenant_id,
        job.attempts + 1,
        outcome,
        JSON.stringify(payload),
      ],
    );
  }

  private claimLimit(): number {
    const configured = Number(
      this.configService.get<string>('TCE_WORKER_CLAIM_LIMIT') ?? 5,
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 5;
  }

  private pollIntervalMs(): number {
    const configured = Number(
      this.configService.get<string>('TCE_WORKER_POLL_MS') ?? 10_000,
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 10_000;
  }

  private async runScheduled(now: number): Promise<void> {
    if (this.running || now < this.nextRunAt) return;
    this.running = true;
    this.nextRunAt = now + this.pollIntervalMs();
    try {
      await this.runOnce();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`TCE worker run failed: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private workerId(): string {
    return (
      this.configService.get<string>('APP_SERVICE_NAME') || 'sgp-tce-worker'
    );
  }
}
