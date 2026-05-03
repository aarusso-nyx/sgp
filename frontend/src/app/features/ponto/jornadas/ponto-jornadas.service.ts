import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

export interface WorkScheduleSummary {
  workScheduleId: string;
  code: string;
  name: string;
  weeklyHours: number;
  toleranceMinutes: number;
  status: string;
  validFrom: string;
  validTo: string | null;
}

export interface AssignmentSummary {
  assignmentId: string;
  employeeId: string;
  workScheduleId: string;
  validFrom: string;
  validTo: string | null;
}

@Injectable({ providedIn: 'root' })
export class PontoJornadasService {
  private readonly api = inject(ApiClient);

  listSchedules(): Observable<WorkScheduleSummary[]> {
    return this.api.get<WorkScheduleSummary[]>('/api/v1/ponto/jornadas');
  }

  createDefaultSchedule(): Observable<WorkScheduleSummary> {
    return this.api.post<WorkScheduleSummary>('/api/v1/ponto/jornadas', {
      code: 'DEFAULT-8H',
      name: 'Jornada padrao 8h',
      weeklyHours: 40,
      toleranceMinutes: 10,
      validFrom: new Date().toISOString().slice(0, 10),
      shifts: [
        {
          code: `FIXED-8H-${Date.now()}`,
          kind: 'FIXED',
          daySchedules: [1, 2, 3, 4, 5].map((weekday) => ({
            weekday,
            entryTime: '08:00',
            lunchOut: '12:00',
            lunchIn: '13:00',
            exitTime: '17:00',
            totalMinutes: 480,
          })),
        },
      ],
    });
  }

  listAssignments(employeeId?: string): Observable<AssignmentSummary[]> {
    const suffix = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    return this.api.get<AssignmentSummary[]>(`/api/v1/ponto/atribuicoes${suffix}`);
  }

  assign(payload: {
    employeeId: string;
    workScheduleId: string;
    validFrom: string;
    validTo?: string;
  }): Observable<AssignmentSummary> {
    return this.api.post<AssignmentSummary>('/api/v1/ponto/atribuicoes', payload);
  }
}
