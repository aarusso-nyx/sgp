import { randomBytes } from 'node:crypto';

import {
  createOtelTraceExporter,
  type RequestSpan,
  type RequestSpanExporter,
} from './otel.tracing';
import { recordWorkerPoll } from './prometheus.metrics';

export interface ObservedWorkerPollSummary {
  discovered: number;
  processed: number;
  failed: number;
  skipped: number;
}

interface WorkerPollObservabilityOptions {
  exporter?: RequestSpanExporter | undefined;
  now?: () => bigint;
}

export async function observeWorkerPoll<T extends ObservedWorkerPollSummary>(
  workerName: string,
  run: () => Promise<T>,
  options: WorkerPollObservabilityOptions = {},
): Promise<T> {
  const now = options.now ?? hrTimeUnixNano;
  const started = now();
  try {
    const summary = await run();
    const ended = now();
    recordWorkerPoll(
      workerName,
      statusFor(summary),
      durationSeconds(started, ended),
    );
    await exportWorkerSpan(workerName, summary, 'ok', started, ended, options);
    return summary;
  } catch (error) {
    const ended = now();
    recordWorkerPoll(workerName, 'error', durationSeconds(started, ended));
    await exportWorkerSpan(
      workerName,
      { discovered: 0, processed: 0, failed: 1, skipped: 0 },
      'error',
      started,
      ended,
      options,
    );
    throw error;
  }
}

export function recordSkippedWorkerPoll(workerName: string): void {
  recordWorkerPoll(workerName, 'skipped', 0);
}

async function exportWorkerSpan(
  workerName: string,
  summary: ObservedWorkerPollSummary,
  status: 'ok' | 'error',
  started: bigint,
  ended: bigint,
  options: WorkerPollObservabilityOptions,
): Promise<void> {
  const exporter = options.exporter ?? createOtelTraceExporter(workerName);
  if (!exporter) return;

  const span: RequestSpan = {
    traceId: randomBytes(16).toString('hex'),
    spanId: randomBytes(8).toString('hex'),
    name: `${workerName} poll`,
    entrypoint: workerName,
    startTimeUnixNano: started.toString(),
    endTimeUnixNano: ended.toString(),
    status,
    attributes: {
      'service.entrypoint': workerName,
      'worker.name': workerName,
      'worker.discovered': summary.discovered,
      'worker.processed': summary.processed,
      'worker.failed': summary.failed,
      'worker.skipped': summary.skipped,
    },
  };
  await Promise.resolve(exporter.exportSpan(span)).catch(() => undefined);
}

function statusFor(summary: ObservedWorkerPollSummary): string {
  if (summary.failed > 0) return 'partial';
  if (summary.skipped > 0 && summary.processed === 0) return 'skipped';
  return 'success';
}

function hrTimeUnixNano(): bigint {
  return BigInt(Date.now()) * 1_000_000n;
}

function durationSeconds(started: bigint, ended: bigint): number {
  return Number(ended - started) / 1_000_000_000;
}
