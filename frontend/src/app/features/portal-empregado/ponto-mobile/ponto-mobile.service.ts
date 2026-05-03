import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface MobileClockResult {
  attemptId: string;
  result: string;
  timeRecordId: string | null;
  workLocationId?: string | null;
  distanceM?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PontoMobileService {
  private readonly api = inject(ApiClient);

  registerDevice(payload: {
    employeeId: string;
    deviceId: string;
    platform: 'IOS' | 'ANDROID';
    publicKey: string;
  }): Observable<unknown> {
    return this.api.post('v1/ponto/mobile/devices', payload);
  }

  createConsent(payload: { employeeId: string; consentVersion: string }): Observable<unknown> {
    return this.api.post('v1/ponto/mobile/consents', payload);
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
    return this.api.post<MobileClockResult, typeof payload>('v1/ponto/mobile/clock', payload);
  }
}
