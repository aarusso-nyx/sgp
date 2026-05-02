import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface FgtsMovement {
  id: string;
  competence: string;
  kind: string;
  baseAmount: string;
  rate: string;
  amount: string;
  payrollRunId: string | null;
  sourceEvent: string;
  createdAt: string;
}

export interface FgtsAccount {
  accountId: string;
  employeeId: string;
  employmentLinkId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  depositBalance: string;
  rescissionFineTotal: string;
  movements: FgtsMovement[];
}

export interface FgtsReprocessResult {
  accountId: string;
  movementId: string;
  employeeId: string;
  baseAmount: string;
  amount: string;
}

@Injectable({ providedIn: 'root' })
export class FgtsApiService {
  constructor(private readonly api: ApiClient) {}

  byEmployee(employeeId: string): Observable<FgtsAccount[]> {
    return this.api.get(`v1/admin/fgts/accounts/${employeeId}`);
  }

  reprocess(payrollRunId: string): Observable<FgtsReprocessResult[]> {
    return this.api.post('v1/admin/fgts/reprocessar', { payrollRunId });
  }
}
