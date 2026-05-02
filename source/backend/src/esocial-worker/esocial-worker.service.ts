import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../common/request-context/request-context.store';
import { DatabaseService } from '../database/database.service';
import { SubmissionService } from './submission/submission.service';
import { RetryPolicyService } from './sync/retry-policy.service';

interface StatusCountRow extends QueryResultRow {
  status: string;
  total: string;
}

export interface ESocialWorkerRunSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class ESocialWorkerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly submissionService: SubmissionService,
    private readonly retryPolicyService: RetryPolicyService,
  ) {}

  health() {
    return {
      ok: true,
      service: 'sgp-esocial-worker',
      status: 'implemented',
      databaseConfigured: this.databaseService.configured,
      schemaVersion: 'S-1.3',
      dispatchAdapter: 'soap-ws-security-mtls',
      timestamp: new Date().toISOString(),
    };
  }

  async status() {
    const base = this.health();
    if (!this.databaseService.configured) {
      return {
        ...base,
        checks: {
          database: 'not_configured',
          eventsByStatus: {},
        },
      };
    }

    const rows = await this.runBypassingRls(() =>
      this.databaseService.query<StatusCountRow>(
        `
        SELECT status::text, count(*)::text AS total
        FROM public.esocial_event
        GROUP BY status
        ORDER BY status
        `,
      ),
    );

    return {
      ...base,
      checks: {
        database: 'configured',
        eventsByStatus: Object.fromEntries(
          rows.map((row) => [row.status, Number(row.total)]),
        ),
      },
    };
  }

  async pollOnce(limit = 10): Promise<ESocialWorkerRunSummary> {
    this.ensureDatabase();
    const retryLimit = this.normalizeLimit(limit);
    const dueRetries = await this.runBypassingRls(() =>
      this.retryPolicyService.consumeDue(retryLimit),
    );
    const result = await this.submissionService.submitPendingBatch(retryLimit);
    if (!result) {
      return {
        discovered: dueRetries.consumed,
        processed: 0,
        failed: 0,
        skipped: 0,
      };
    }
    const failed = result.status === 'ACCEPTED' ? 0 : result.eventCount;
    return {
      discovered: result.eventCount + dueRetries.consumed,
      processed: result.status === 'ACCEPTED' ? result.eventCount : 0,
      failed,
      skipped: 0,
    };
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 1) return 10;
    return Math.min(limit, 100);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for eSocial worker operations',
      );
    }
  }

  private runBypassingRls<T>(fn: () => Promise<T>): Promise<T> {
    return RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'esocial-worker' },
      fn,
    );
  }
}
