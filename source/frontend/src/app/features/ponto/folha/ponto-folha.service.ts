import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface TimesheetPayrollAggregate {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  workedMinutes: number;
  expectedMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  nightMinutes: number;
  lateMinutes: number;
  absenceUnpaidMinutes: number;
  absencePaidMinutes: number;
  hourBankSettlementMinutes: number;
}

export interface PayrollBridgeLine {
  code: string;
  kind: string;
  quantityHours: string;
  referenceValue: string;
  amount: string;
  sourceMinutes: number;
}

export interface PayrollBridgePreview {
  payrollRunId: string;
  timesheetPeriodId: string;
  aggregate: TimesheetPayrollAggregate;
  lines: PayrollBridgeLine[];
  alreadyApplied: boolean;
  payrollBridgeEventId?: string;
  appliedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PontoFolhaService {
  private readonly http = inject(HttpClient);

  preview(payload: {
    payrollRunId: string;
    timesheetPeriodId: string;
  }): Observable<PayrollBridgePreview> {
    return this.http.post<PayrollBridgePreview>('/api/v1/ponto/folha/preview', payload);
  }

  apply(payload: {
    payrollRunId: string;
    timesheetPeriodId: string;
  }): Observable<PayrollBridgePreview> {
    return this.http.post<PayrollBridgePreview>('/api/v1/ponto/folha/apply', payload);
  }
}
