import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface ReintegrationOrder {
  id: string;
  employmentLinkId: string;
  reinstatementDate: string;
  kind: string;
  processNumber: string | null;
  court: string | null;
  decisionDate: string;
  attachmentUri: string | null;
  status: string;
  originalS2299Receipt: string | null;
  reprocessedCompetencies?: string[];
  totalPayable?: string;
}

export interface ReintegrationRegisterBody {
  employmentLinkId: string;
  reinstatementDate: string;
  kind: string;
  processNumber?: string;
  court?: string;
  decisionDate: string;
  attachmentUri?: string;
  originalTerminationEventId?: string;
  originalS2299Receipt?: string;
}

@Injectable({ providedIn: 'root' })
export class ReintegracaoService {
  constructor(private readonly api: ApiClient) {}

  register(body: ReintegrationRegisterBody): Observable<ReintegrationOrder> {
    return this.api.post<ReintegrationOrder, ReintegrationRegisterBody>(
      '/v1/admin/hr/reintegrations',
      body,
    );
  }

  apply(orderId: string): Observable<ReintegrationOrder> {
    return this.api.post<ReintegrationOrder, Record<string, never>>(
      `/v1/admin/hr/reintegrations/${orderId}/apply`,
      {},
    );
  }

  transmit(orderId: string): Observable<Record<string, unknown>> {
    return this.api.post<Record<string, unknown>, Record<string, never>>(
      `/v1/admin/esocial/s2298/${orderId}`,
      {},
    );
  }
}
