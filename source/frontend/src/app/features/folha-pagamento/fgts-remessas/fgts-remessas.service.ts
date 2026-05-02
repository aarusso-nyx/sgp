import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export type FgtsRemittanceKind = 'GRF_MONTHLY' | 'GRRF_TERMINATION';

export interface FgtsRemittance {
  id: string;
  tenantId: string;
  competence: string;
  kind: FgtsRemittanceKind;
  status: string;
  generatedAt: string | null;
  paidAt: string | null;
  totalBase: string;
  totalAmount: string;
  fileUri: string | null;
  daeBarcode: string | null;
  layoutVersion: string;
  adapterKey: string;
  fileHash: string | null;
  signed: boolean;
  createdAt: string;
  updatedAt: string;
  fileContentBase64?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FgtsRemessasService {
  constructor(private readonly api: ApiClient) {}

  generateMonthly(competence: string): Observable<FgtsRemittance> {
    return this.api.post('v1/admin/fgts/remittances', {
      kind: 'GRF_MONTHLY',
      competence,
    });
  }

  generateTermination(input: {
    employmentLinkId: string;
    terminationId: string;
  }): Observable<FgtsRemittance> {
    return this.api.post('v1/admin/fgts/remittances', {
      kind: 'GRRF_TERMINATION',
      employmentLinkId: input.employmentLinkId,
      terminationId: input.terminationId,
    });
  }

  find(id: string): Observable<FgtsRemittance> {
    return this.api.get(`v1/admin/fgts/remittances/${id}`);
  }
}
