import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ESocialClosurePending {
  eventKind: 'S-1200' | 'S-1210';
  payrollRunId: string | null;
  paymentBatchId: string | null;
  employeeId: string;
  reason: string;
}

export interface ESocialTotalizer {
  competence: string;
  kind: 'S-5001' | 'S-5002' | 'S-5003' | 'S-5011' | 'S-5012' | 'S-5013';
  sourceEventRecibo: string;
  receivedAt: string;
}

export interface ESocialClosureState {
  competence: string;
  status: 'PENDING' | 'EMITTED' | 'ACCEPTED' | 'REJECTED' | null;
  recibo: string | null;
  emittedAt: string | null;
  acceptedAt: string | null;
  pending: ESocialClosurePending[];
  totalizers: ESocialTotalizer[];
}

export interface ESocialClosureResult {
  competence: string;
  xmlHash: string;
  emitted: boolean;
  state: ESocialClosureState;
}

@Injectable({ providedIn: 'root' })
export class ESocialFechamentoService {
  constructor(private readonly http: HttpClient) {}

  status(year: number, month: number): Observable<ESocialClosureState> {
    return this.http.get<ESocialClosureState>(
      `/api/v1/esocial/fechamento?year=${year}&month=${month}`,
    );
  }

  close(year: number, month: number): Observable<ESocialClosureResult> {
    return this.http.post<ESocialClosureResult>('/api/v1/esocial/fechamento/fechar', {
      year,
      month,
    });
  }
}
