import type { RequestSpan } from './otel.tracing';
import { prometheusRegistry } from './prometheus.metrics';
import {
  observeWorkerPoll,
  recordSkippedWorkerPoll,
} from './worker-poll-observability';

describe('worker poll observability', () => {
  it('records Prometheus metrics and emits a worker poll span', async () => {
    const spans: RequestSpan[] = [];

    const result = await observeWorkerPoll(
      'sgp-integrations-worker',
      async () => ({
        discovered: 2,
        processed: 2,
        failed: 0,
        skipped: 0,
      }),
      {
        now: () => 1_000_000_000n,
        exporter: {
          exportSpan: (span) => {
            spans.push(span);
          },
        },
      },
    );

    expect(result.processed).toBe(2);
    expect(spans[0]).toEqual(
      expect.objectContaining({
        name: 'sgp-integrations-worker poll',
        entrypoint: 'sgp-integrations-worker',
        status: 'ok',
      }),
    );
    expect(spans[0]?.attributes).toEqual(
      expect.objectContaining({
        'worker.discovered': 2,
        'worker.processed': 2,
      }),
    );
    expect(prometheusRegistry.collect()).toContain(
      'sgp_worker_polls_total{status="success",worker="sgp-integrations-worker"} 1',
    );
  });

  it('records skipped worker polls without opening a span', () => {
    recordSkippedWorkerPoll('sgp-integrations-worker');

    expect(prometheusRegistry.collect()).toContain(
      'sgp_worker_polls_total{status="skipped",worker="sgp-integrations-worker"} 1',
    );
  });
});
