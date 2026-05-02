import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ESocialExcludableEvent {
  id: string;
  eventKind: string;
  reference: string;
  competence: string;
  receipt: string;
  status: string;
  sourceEntityKind: string | null;
  sourceEntityId: string | null;
}

export interface S3000RequestStatus {
  requestId: string;
  targetEventId: string;
  targetEventKind: string;
  targetRecibo: string;
  requestedByUserId: string | null;
  justification: string;
  requestedAt: string;
  status: string;
  blockReason: string | null;
  emittedEventId: string | null;
  acceptedReceipt: string | null;
  emitted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ESocialExclusaoService {
  constructor(private readonly http: HttpClient) {}

  events(): Observable<ESocialExcludableEvent[]> {
    return this.http.get<ESocialExcludableEvent[]>('/api/v1/esocial/events/excludable');
  }

  requests(): Observable<S3000RequestStatus[]> {
    return this.http.get<S3000RequestStatus[]>('/api/v1/esocial/exclusions');
  }

  exclude(eventId: string, justification: string): Observable<S3000RequestStatus> {
    return this.http.post<S3000RequestStatus>(`/api/v1/esocial/events/${eventId}/exclude`, {
      justification,
    });
  }
}
