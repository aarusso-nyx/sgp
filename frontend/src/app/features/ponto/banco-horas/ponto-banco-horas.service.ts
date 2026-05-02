import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface HourBank {
  hourBankId: string;
  employeeId: string;
  regime: string;
  openedAt: string;
  expiresAt: string;
  balanceMinutes: number;
  status: string;
}

export interface HourBankMovement {
  hourBankMovementId: string;
  hourBankId: string;
  workDate: string;
  kind: string;
  minutes: number;
  createdAt: string;
  payrollRunId: string | null;
}

@Injectable({ providedIn: 'root' })
export class PontoBancoHorasService {
  private readonly http = inject(HttpClient);

  list(): Observable<HourBank[]> {
    return this.http.get<HourBank[]>('/api/v1/ponto/banco-horas');
  }

  movements(hourBankId: string): Observable<HourBankMovement[]> {
    return this.http.get<HourBankMovement[]>(`/api/v1/ponto/banco-horas/${hourBankId}/movimentos`);
  }

  adjust(payload: {
    hourBankId: string;
    workDate: string;
    minutes: number;
  }): Observable<HourBankMovement> {
    return this.http.post<HourBankMovement>('/api/v1/ponto/banco-horas/ajuste-manual', payload);
  }
}
