import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type S1xxxEventKind = 'S-1000' | 'S-1005' | 'S-1010' | 'S-1020' | 'S-1050' | 'S-1070';

export interface S1xxxStatus {
  eventKind: S1xxxEventKind;
  sourceEntityId: string;
  lastEmittedAt: string | null;
  lastPayloadHash: string | null;
}

export interface S1xxxDispatchResult {
  eventKind: S1xxxEventKind;
  sourceEntityId: string;
  sourceEntityKind: string;
  xmlHash: string;
  emitted: boolean;
}

@Injectable({ providedIn: 'root' })
export class ESocialTabelasService {
  constructor(private readonly http: HttpClient) {}

  status(): Observable<S1xxxStatus[]> {
    return this.http.get<S1xxxStatus[]>('/api/v1/esocial/tabelas-iniciais');
  }

  emitAll(force = false): Observable<S1xxxDispatchResult[]> {
    return this.http.post<S1xxxDispatchResult[]>('/api/v1/esocial/tabelas-iniciais/emitir', {
      force,
    });
  }

  emitOne(eventKind: S1xxxEventKind, force = false): Observable<S1xxxDispatchResult[]> {
    return this.http.post<S1xxxDispatchResult[]>(
      `/api/v1/esocial/tabelas-iniciais/${eventKind}/emitir`,
      { force },
    );
  }
}
