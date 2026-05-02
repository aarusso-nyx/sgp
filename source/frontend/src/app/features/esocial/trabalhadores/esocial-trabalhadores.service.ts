import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ESocialWorkerStatus {
  employeeId: string;
  registration: string;
  name: string;
  s2200Receipt: string | null;
  s2200EmittedAt: string | null;
  pendingS2205: number;
}

export interface ESocialWorkerDispatchResult {
  eventKind: 'S-2200' | 'S-2205';
  employeeId: string;
  xmlHash: string;
  emitted: boolean;
  blockedReason?: string;
}

@Injectable({ providedIn: 'root' })
export class ESocialTrabalhadoresService {
  constructor(private readonly http: HttpClient) {}

  status(): Observable<ESocialWorkerStatus[]> {
    return this.http.get<ESocialWorkerStatus[]>('/api/v1/esocial/trabalhadores');
  }

  reemitS2200(employeeId: string): Observable<ESocialWorkerDispatchResult> {
    return this.http.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/trabalhadores/${employeeId}/s2200/emitir`,
      { force: true },
    );
  }

  emitS2205(employeeId: string): Observable<ESocialWorkerDispatchResult> {
    return this.http.post<ESocialWorkerDispatchResult>(
      `/api/v1/esocial/trabalhadores/${employeeId}/s2205/emitir`,
      {},
    );
  }
}
