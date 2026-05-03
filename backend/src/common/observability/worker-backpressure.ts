import { QueryResultRow } from 'pg';

import {
  recordQueueDepth,
  recordWorkerActiveClaims,
} from './prometheus.metrics';

interface CountRow extends QueryResultRow {
  total: string;
}

export interface WorkerBackpressureState {
  queueDepth: number;
  activeClaims: number;
  capacity: number;
}

export interface WorkerBackpressureDecision extends WorkerBackpressureState {
  limit: number;
  skipped: boolean;
}

export function decideWorkerBackpressure(
  worker: string,
  requestedLimit: number,
  state: WorkerBackpressureState,
): WorkerBackpressureDecision {
  recordQueueDepth(worker, state.queueDepth);
  recordWorkerActiveClaims(worker, state.activeClaims);

  const availableCapacity = Math.max(0, state.capacity - state.activeClaims);
  const limit = Math.min(
    Math.max(1, requestedLimit),
    Math.max(0, state.queueDepth),
    availableCapacity,
  );

  return {
    ...state,
    limit,
    skipped: limit === 0,
  };
}

export async function countRows(
  query: <T extends QueryResultRow>(
    sql: string,
    values?: readonly unknown[],
  ) => Promise<T[]>,
  sql: string,
  values: readonly unknown[] = [],
): Promise<number> {
  const rows = await query<CountRow>(sql, values);
  return Number(rows[0]?.total ?? 0);
}
