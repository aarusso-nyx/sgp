import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

export interface ESocialWorkerStatus {
  employeeId: string;
  registration: string;
  name: string;
  s2200Receipt: string | null;
  s2200EmittedAt: string | null;
  pendingS2205: number;
}

export interface ESocialWorkerDispatchResult {
  eventKind: 'S-2200' | 'S-2205' | 'S-2210' | 'S-2220' | 'S-2230' | 'S-2240' | 'S-2299';
  employeeId?: string;
  pendingId?: string;
  sourceEntityId?: string;
  xmlHash: string;
  emitted: boolean;
  blockedReason?: string;
  lastError?: string;
}

export interface ESocialWorkerEventQueue {
  id: string;
  eventKind: 'S-2210' | 'S-2220' | 'S-2230' | 'S-2240' | 'S-2299';
  sourceId: string;
  employeeName: string;
  status: string;
  enqueuedAt: string;
  receipt: string | null;
  blockedReason: string | null;
  lastError: string | null;
  asoRecordId: string | null;
  catEmissionId: string | null;
  catKind: string | null;
  environmentalExposureId: string | null;
  triggerEvent: 'START' | 'END' | 'CHANGE' | null;
}

@Injectable({ providedIn: 'root' })
export class ESocialTrabalhadoresService {
  constructor(private readonly api: ApiClient) {}

  status(): Observable<ESocialWorkerStatus[]> {
    return this.api.get<ESocialWorkerStatus[]>('/api/v1/esocial/trabalhadores');
  }

  reemitS2200(employeeId: string): Observable<ESocialWorkerDispatchResult> {
    return this.api.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/trabalhadores/${employeeId}/s2200/emitir`,
      { force: true },
    );
  }

  emitS2205(employeeId: string): Observable<ESocialWorkerDispatchResult> {
    return this.api.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/trabalhadores/${employeeId}/s2205/emitir`,
      {},
    );
  }

  eventQueue(): Observable<ESocialWorkerEventQueue[]> {
    return this.api.get<ESocialWorkerEventQueue[]>('/api/v1/esocial/eventos-trabalhador');
  }

  emitS2210(catEmissionId: string): Observable<ESocialWorkerDispatchResult> {
    return this.api.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/eventos-trabalhador/s2210/${catEmissionId}/emitir`,
      {},
    );
  }

  emitS2230(pendingId: string): Observable<ESocialWorkerDispatchResult> {
    return this.api.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/eventos-trabalhador/s2230/${pendingId}/emitir`,
      {},
    );
  }

  emitS2240(
    environmentalExposureId: string,
    triggerEvent: 'START' | 'END' | 'CHANGE',
  ): Observable<ESocialWorkerDispatchResult> {
    return this.api.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/eventos-trabalhador/s2240/${environmentalExposureId}/emitir`,
      { triggerEvent },
    );
  }

  retryS2220(asoRecordId: string): Observable<ESocialWorkerDispatchResult> {
    return this.api.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/eventos-trabalhador/s2220/${asoRecordId}/retry`,
      {},
    );
  }

  emitS2299(pendingId: string): Observable<ESocialWorkerDispatchResult> {
    return this.api.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/eventos-trabalhador/s2299/${pendingId}/emitir`,
      {},
    );
  }
}
