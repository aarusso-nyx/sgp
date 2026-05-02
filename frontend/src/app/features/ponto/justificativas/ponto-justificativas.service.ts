import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface PontoJustificativa {
  absenceJustificationId: string;
  employeeId: string;
  kind: string;
  absenceStart: string;
  absenceEnd: string;
  status: string;
  reason: string;
  attachmentId: string | null;
  payrollTreatment: string;
  medicalLeaveId: string | null;
}

@Injectable({ providedIn: 'root' })
export class PontoJustificativasService {
  private readonly http = inject(HttpClient);

  list(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<PontoJustificativa[]>(`/api/v1/ponto/justifications${query}`);
  }

  request(input: {
    employeeId: string;
    kind: string;
    absenceStart: string;
    absenceEnd: string;
    reason: string;
    requestedByUserId: string;
    attachmentId?: string;
    payrollTreatment?: string;
  }) {
    return this.http.post<PontoJustificativa>('/api/v1/ponto/justifications', input);
  }

  decide(id: string, input: { decision: string; approverUserId: string; reason?: string }) {
    return this.http.post<PontoJustificativa>(`/api/v1/ponto/justifications/${id}/decide`, input);
  }
}
