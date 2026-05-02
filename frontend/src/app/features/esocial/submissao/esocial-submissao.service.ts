import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  constructor(private readonly http: HttpClient) {}

  listBatches(): Observable<ESocialSubmissionBatch[]> {
    return this.http.get<ESocialSubmissionBatch[]>('/api/v1/esocial/submissoes');
  }

  listCircuits(): Observable<ESocialCircuitState[]> {
    return this.http.get<ESocialCircuitState[]>('/api/v1/esocial/submissoes/circuitos');
  }

  forceRetry(batchId: string): Observable<ESocialSubmissionBatch> {
    return this.http.post<ESocialSubmissionBatch>(
      `/api/v1/esocial/submissoes/${batchId}/retry`,
      {},
    );
  }
}
