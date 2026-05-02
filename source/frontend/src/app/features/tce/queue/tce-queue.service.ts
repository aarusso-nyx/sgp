import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface TceQueueJob {
  id: string;
  submissionId: string;
  adapterId: string;
  endpointUrl: string | null;
  stateCode: string | null;
  competenceYear: number | null;
  competenceMonth: number | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
  lastErrorKind: string | null;
  lastErrorPayload: Record<string, unknown> | null;
  attemptsHistory?: TceSubmissionAttempt[];
}

export interface TceSubmissionAttempt {
  id: string;
  attempt_number?: number;
  attemptNumber?: number;
  outcome: string;
  started_at?: string;
  startedAt?: string;
  finished_at?: string | null;
  finishedAt?: string | null;
  error_payload?: Record<string, unknown> | null;
  errorPayload?: Record<string, unknown> | null;
}

export interface TceCircuitState {
  adapterId: string;
  endpointUrl: string;
  state: string;
  failureCount: number;
  openedAt: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class TceQueueApiService {
  constructor(private readonly api: ApiClient) {}

  list(filters: {
    adapter?: string;
    stateCode?: string;
    status?: string;
    competence?: string;
  }): Observable<TceQueueJob[]> {
    const query = new URLSearchParams();
    if (filters.adapter) query.set('adapter', filters.adapter);
    if (filters.stateCode) query.set('state_code', filters.stateCode);
    if (filters.status) query.set('status', filters.status);
    if (filters.competence) query.set('competence', filters.competence);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.api.get(`v1/tce/queue${suffix}`);
  }

  get(id: string): Observable<TceQueueJob> {
    return this.api.get(`v1/tce/queue/${id}`);
  }

  replay(id: string): Observable<TceQueueJob> {
    return this.api.post(`v1/tce/queue/${id}/replay`, {});
  }

  circuits(): Observable<TceCircuitState[]> {
    return this.api.get('v1/tce/circuits');
  }

  resetCircuit(adapterId: string, endpointUrl: string): Observable<TceCircuitState> {
    return this.api.post(
      `v1/tce/circuits/${encodeURIComponent(adapterId)}/${encodeURIComponent(endpointUrl)}/reset`,
      {},
    );
  }
}
