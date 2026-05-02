import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface TsvContractChange {
  id: string;
  effectiveDate: string;
  fieldsChanged: Record<string, true>;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  reason: string;
}

export interface TsvContractPatch {
  effectiveDate: string;
  reason: string;
  role?: string;
  monthlyAmount?: string;
  weeklyHours?: string;
  workplaceId?: string;
  supervisorEmployeeId?: string;
}

@Injectable({ providedIn: 'root' })
export class TsvContratosService {
  constructor(private readonly api: ApiClient) {}

  update(contractId: string, body: TsvContractPatch): Observable<TsvContractChange> {
    return this.api.patch<TsvContractChange, TsvContractPatch>(
      `/v1/admin/hr/tsv-contracts/${contractId}`,
      body,
    );
  }

  transmit(changeId: string): Observable<Record<string, unknown>> {
    return this.api.post<Record<string, unknown>, Record<string, never>>(
      `/v1/admin/esocial/s2306/${changeId}`,
      {},
    );
  }
}
