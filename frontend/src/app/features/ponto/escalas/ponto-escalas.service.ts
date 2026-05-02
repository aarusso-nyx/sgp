import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ShiftPatternDay {
  dayIndex: number;
  isWorking: boolean;
  entryTime: string | null;
  exitTime: string | null;
  lunchMinutes: number | null;
  nightShiftFlag: boolean;
  hazardFlag: boolean;
  expectedMinutes: number;
}

export interface ShiftPattern {
  shiftPatternId: string;
  code: string;
  name: string;
  cycleDays: number;
  kind: string;
  days: ShiftPatternDay[];
}

export interface DutyRoster {
  dutyRosterId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  publishedAt: string | null;
}

export interface RosterEntry {
  employeeId: string;
  workDate: string;
  expectedEntry: string | null;
  expectedExit: string | null;
  expectedMinutes: number;
  nightShiftFlag: boolean;
  hazardFlag: boolean;
}

@Injectable({ providedIn: 'root' })
export class PontoEscalasService {
  private readonly http = inject(HttpClient);

  listPatterns(): Observable<ShiftPattern[]> {
    return this.http.get<ShiftPattern[]>('/api/v1/ponto/escalas/padroes');
  }

  createDefault12x36(): Observable<ShiftPattern> {
    return this.http.post<ShiftPattern>('/api/v1/ponto/escalas/padroes', {
      code: `12X36-${Date.now()}`,
      name: 'Escala 12x36 noturna',
      cycleDays: 2,
      kind: 'CLT_12X36',
      days: [
        {
          dayIndex: 0,
          isWorking: true,
          entryTime: '19:00',
          exitTime: '07:00',
          lunchMinutes: 0,
          nightShiftFlag: true,
          hazardFlag: false,
        },
        { dayIndex: 1, isWorking: false },
      ],
    });
  }

  listRosters(): Observable<DutyRoster[]> {
    return this.http.get<DutyRoster[]>('/api/v1/ponto/escalas/rosters');
  }

  generateRoster(payload: {
    employeeIds: string[];
    periodStart: string;
    periodEnd: string;
  }): Observable<DutyRoster> {
    return this.http.post<DutyRoster>('/api/v1/ponto/escalas/rosters', payload);
  }

  publish(rosterId: string): Observable<DutyRoster> {
    return this.http.post<DutyRoster>(`/api/v1/ponto/escalas/rosters/${rosterId}/publicar`, {});
  }

  lock(rosterId: string): Observable<DutyRoster> {
    return this.http.post<DutyRoster>(`/api/v1/ponto/escalas/rosters/${rosterId}/travar`, {});
  }

  upcoming(employeeId: string): Observable<RosterEntry[]> {
    return this.http.get<RosterEntry[]>(
      `/api/v1/ponto/escalas/proximas?employeeId=${encodeURIComponent(employeeId)}`,
    );
  }
}
