import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

export interface ESocialSubmissionBatch {
  batchId: string;
  environment: 'PRODUCTION' | 'QUALIFICATION';
  endpointUrl: string;
  eventIds: string[];
  soapRequestHash: string | null;
  soapResponseHash: string | null;
  httpStatus: number | null;
  status: 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT' | 'RETRY';
  attempts: number;
  nextAttemptAt: string | null;
  sentAt: string | null;
  responseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ESocialCircuitState {
  endpointUrl: string;
  openedAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
}

@Injectable({ providedIn: 'root' })
export class ESocialSubmissaoService {
  constructor(private readonly api: ApiClient) {}

  listBatches(): Observable<ESocialSubmissionBatch[]> {
    return this.api.get<ESocialSubmissionBatch[]>('/api/v1/esocial/submissoes');
  }

  listCircuits(): Observable<ESocialCircuitState[]> {
    return this.api.get<ESocialCircuitState[]>('/api/v1/esocial/submissoes/circuitos');
  }

  forceRetry(batchId: string): Observable<ESocialSubmissionBatch> {
    return this.api.post<ESocialSubmissionBatch>(`/api/v1/esocial/submissoes/${batchId}/retry`, {});
  }
}
