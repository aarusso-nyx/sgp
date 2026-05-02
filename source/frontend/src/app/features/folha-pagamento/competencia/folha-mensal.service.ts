import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface MonthlyPayrollReviewLine {
  employeeId: string;
  registration: string;
  employeeName: string;
  totalEarnings: string;
  totalDeductions: string;
  netAmount: string;
}

export interface MonthlyPayrollResult {
  competenceId: string;
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  competenceStatus: string;
  payrollStatus: string;
  employeeCount: number;
  totalEarnings: string;
  totalDeductions: string;
  totalNet: string;
  review: MonthlyPayrollReviewLine[];
}

export interface MonthlyPayrollCompetence {
  year: number;
  month: number;
}

@Injectable({ providedIn: 'root' })
export class FolhaMensalService {
  constructor(private readonly api: ApiClient) {}

  open(input: MonthlyPayrollCompetence): Observable<MonthlyPayrollResult> {
    return this.api.post('v1/folhas/mensal/abrir', input);
  }

  calculate(input: MonthlyPayrollCompetence): Observable<MonthlyPayrollResult> {
    return this.api.post('v1/folhas/mensal/calcular', input);
  }

  approve(input: MonthlyPayrollCompetence): Observable<MonthlyPayrollResult> {
    return this.api.post('v1/folhas/mensal/aprovar', input);
  }

  generate(input: MonthlyPayrollCompetence): Observable<MonthlyPayrollResult> {
    return this.api.post('v1/folhas/mensal/gerar', input);
  }

  close(input: MonthlyPayrollCompetence): Observable<MonthlyPayrollResult> {
    return this.api.post('v1/folhas/mensal/fechar', input);
  }

  review(input: MonthlyPayrollCompetence): Observable<MonthlyPayrollResult> {
    return this.api.get('v1/folhas/mensal/revisao', {
      year: input.year,
      month: input.month,
    });
  }
}
