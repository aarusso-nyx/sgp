import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface TceLifecycleEvent {
  id: string;
  adapterId: string;
  event: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface TceAdapterRegistry {
  id: string;
  adapterId: string;
  stateCode: string;
  municipalCode: string | null;
  organKind: 'TCE' | 'TCM' | 'TCU';
  version: string;
  status: 'REGISTERED' | 'ENABLED' | 'DISABLED' | 'DEPRECATED';
  capabilities: Record<string, unknown>;
  registeredAt: string;
  lastHealthCheckAt: string | null;
  lastHealthStatus: string | null;
  lifecycleEvents: TceLifecycleEvent[];
}

@Injectable({ providedIn: 'root' })
export class TceAdaptersApiService {
  constructor(private readonly api: ApiClient) {}

  list(): Observable<TceAdapterRegistry[]> {
    return this.api.get('v1/tce/adapters');
  }

  enable(adapterId: string): Observable<TceAdapterRegistry> {
    return this.api.post(`v1/tce/adapters/${adapterId}/enable`, {});
  }

  disable(adapterId: string): Observable<TceAdapterRegistry> {
    return this.api.post(`v1/tce/adapters/${adapterId}/disable`, {});
  }
}
