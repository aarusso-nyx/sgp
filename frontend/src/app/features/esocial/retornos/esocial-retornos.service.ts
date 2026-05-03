import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

export type ESocialReturnStatus =
  | 'PROCESSADO_COM_ERROS'
  | 'ERRO_TECNICO_RETENTAVEL'
  | 'ERRO_DEFINITIVO';

export interface ESocialReturnFailure {
  tenantId: string;
  eventId: string;
  eventType: string;
  reference: string;
  competence: string;
  status: ESocialReturnStatus;
  responseCode: string | null;
  translatedMessage: string | null;
  responseDescription: string | null;
  responseErrors: Array<{
    type?: string;
    code?: string;
    description?: string;
    location?: string | null;
  }>;
  lastResponseAt: string | null;
  retryCount: number;
  attempt: number | null;
  nextAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ESocialRetornosService {
  constructor(private readonly api: ApiClient) {}

  listFailures(status?: ESocialReturnStatus): Observable<ESocialReturnFailure[]> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.api.get<ESocialReturnFailure[]>(`/api/v1/esocial/retornos/falhas${suffix}`);
  }

  forceRetry(eventId: string): Observable<ESocialReturnFailure> {
    return this.api.post<ESocialReturnFailure>(
      `/api/v1/esocial/retornos/eventos/${eventId}/retry`,
      {},
    );
  }

  markHandled(eventId: string): Observable<{ eventId: string; handled: boolean }> {
    return this.api.post<{ eventId: string; handled: boolean }>(
      `/api/v1/esocial/retornos/eventos/${eventId}/tratado`,
      {},
    );
  }
}
