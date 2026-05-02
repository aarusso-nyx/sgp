import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { PagedResult } from '../../../core/models/paged-result';

export interface RemittanceSummary {
  id: string;
  status: string;
  competenceYear: number;
  competenceMonth: number;
  paymentDate: string | null;
  fileName: string | null;
  fileHash: string | null;
  bankCode: number | null;
  layoutVersion: string | null;
  recordCount: number | null;
  totalAmount: string;
  generatedAt: string | null;
  attachmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemittanceRequestResult {
  requestId: string;
  status: string;
  requestedAt: string;
  metadata: {
    remittanceId?: string;
    remittanceNumber?: number;
    fileName?: string;
  };
}

export interface PresignedDownload {
  documentId: string;
  downloadUrl: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class RemessaBancariaService {
  constructor(private readonly api: ApiClient) {}

  list(year: number, month: number): Observable<PagedResult<RemittanceSummary>> {
    return this.api.list('v1/folha/remessa', { year, month });
  }

  generate(input: {
    payrollRunId: string;
    bankId: string;
    paymentDate?: string;
  }): Observable<RemittanceRequestResult> {
    return this.api.post(`v1/folha/${input.payrollRunId}/remessa`, {
      bankId: input.bankId,
      format: 'CNAB240',
      paymentDate: input.paymentDate,
      launchType: 'ACCOUNT_CREDIT',
    });
  }

  download(attachmentId: string): Observable<PresignedDownload> {
    return this.api.get(`v1/arquivos/${attachmentId}/download`);
  }
}
