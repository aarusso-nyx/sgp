import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface DecimoTerceiroRunResult {
  payrollRunId: string;
  kind: 'DECIMO_TERCEIRO_ADIANTAMENTO' | 'DECIMO_TERCEIRO_FECHAMENTO';
  year: number;
  month: number;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
}

export interface FeriasRunResult {
  payrollRunId: string;
  vacationRecordId: string;
  employeeId: string;
  year: number;
  month: number;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
}

export interface PayrollRunExecutionHistory {
  id: string;
  status: string;
  changedAt: string;
  note: string;
  kind: 'CALCULATED' | 'RECALCULATED' | null;
  employeeCount: string | null;
  totalNet: string | null;
}

@Injectable({ providedIn: 'root' })
export class DecimoTerceiroProcessamentosService {
  constructor(private readonly api: ApiClient) {}

  runAdiantamento(year: number): Observable<DecimoTerceiroRunResult> {
    return this.api.post('v1/folhas/decimo-terceiro/adiantamento', { year });
  }

  runFechamento(year: number): Observable<DecimoTerceiroRunResult> {
    return this.api.post('v1/folhas/decimo-terceiro/fechamento', { year });
  }

  runFerias(vacationRecordId: string): Observable<FeriasRunResult> {
    return this.api.post('v1/folhas/ferias/calcular', { vacationRecordId });
  }

  getExecutionHistory(payrollRunId: string): Observable<PayrollRunExecutionHistory[]> {
    return this.api.get(`v1/folhas/${payrollRunId}/historico`);
  }
}
