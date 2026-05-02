import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface MobileClockResult {
  attemptId: string;
  result: string;
  timeRecordId: string | null;
  workLocationId?: string | null;
  distanceM?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PontoMobileService {
  private readonly http = inject(HttpClient);

  registerDevice(payload: {
    employeeId: string;
    deviceId: string;
    platform: 'IOS' | 'ANDROID';
    publicKey: string;
  }): Observable<unknown> {
    return this.http.post('/api/v1/ponto/mobile/devices', payload);
  }

  createConsent(payload: { employeeId: string; consentVersion: string }): Observable<unknown> {
    return this.http.post('/api/v1/ponto/mobile/consents', payload);
  }

  clock(payload: {
    employeeId: string;
    lat: number;
    lon: number;
    gpsPrecisionM: number;
    occurredAt: string;
    mockLocation: boolean;
    deviceId: string;
    platform: 'IOS' | 'ANDROID';
  }): Observable<MobileClockResult> {
    return this.http.post<MobileClockResult>('/api/v1/ponto/mobile/clock', payload);
  }
}
