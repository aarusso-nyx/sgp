import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

export interface ESocialPeriodicPayrollStatus {
  payrollRunId: string;
  paymentBatchId: string | null;
  employeeId: string;
  registration: string;
  name: string;
  payrollStatus: string;
  paymentStatus: string | null;
  s1200Receipt: string | null;
  s1200EmittedAt: string | null;
  s1210Receipt: string | null;
  s1210EmittedAt: string | null;
}

export interface ESocialPeriodicPayrollDispatchResult {
  eventKind: 'S-1200' | 'S-1210';
  employeeId: string;
  payrollRunId?: string | null;
  paymentBatchId?: string;
  xmlHash: string;
  emitted: boolean;
  blockedReason?: string;
}

@Injectable({ providedIn: 'root' })
export class ESocialFolhaPeriodicaService {
  constructor(private readonly api: ApiClient) {}

  status(year: number, month: number): Observable<ESocialPeriodicPayrollStatus[]> {
    return this.api.get<ESocialPeriodicPayrollStatus[]>(
      `/api/v1/esocial/folha-periodica?year=${year}&month=${month}`,
    );
  }

  emitS1200(
    payrollRunId: string,
    employeeId?: string,
    force = false,
  ): Observable<ESocialPeriodicPayrollDispatchResult[]> {
    return this.api.post<ESocialPeriodicPayrollDispatchResult[]>(
      `/api/v1/esocial/folha-periodica/runs/${payrollRunId}/s1200/emitir`,
      { employeeId, force },
    );
  }

  emitS1210(
    paymentBatchId: string,
    employeeId?: string,
    force = false,
  ): Observable<ESocialPeriodicPayrollDispatchResult[]> {
    return this.api.post<ESocialPeriodicPayrollDispatchResult[]>(
      `/api/v1/esocial/folha-periodica/payments/${paymentBatchId}/s1210/emitir`,
      { employeeId, force },
    );
  }

  reemitWorker(
    row: ESocialPeriodicPayrollStatus,
  ): Observable<ESocialPeriodicPayrollDispatchResult[]> {
    const calls = [this.emitS1200(row.payrollRunId, row.employeeId, true)];
    if (row.paymentBatchId) {
      calls.push(this.emitS1210(row.paymentBatchId, row.employeeId, true));
    }
    return calls.length === 1 ? calls[0] : forkJoin(calls).pipe(map((results) => results.flat()));
  }
}
