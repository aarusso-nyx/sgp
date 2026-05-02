import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface PaymentReturnResult {
  returnFileId: string;
  remittanceFileId: string;
  bankCode: number;
  fileHash: string;
  processedRecords: number;
  rejectedRecords: number;
}

export interface ReprocessRejectedResult {
  remittanceFileId: string;
  sourceReturnFileId: string;
  detailCount: number;
}

@Injectable({ providedIn: 'root' })
export class RetornoBancarioService {
  constructor(private readonly api: ApiClient) {}

  process(input: {
    remittanceFileId: string;
    remittanceFileHash: string;
    content: string;
  }): Observable<PaymentReturnResult> {
    return this.api.post('v1/payment/return-files', {
      ...input,
      encoding: 'ascii',
    });
  }

  reprocessRejected(returnFileId: string): Observable<ReprocessRejectedResult> {
    return this.api.post(
      `v1/payment/return-files/${returnFileId}/reprocess-rejected`,
      {},
    );
  }
}
