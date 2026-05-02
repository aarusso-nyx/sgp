import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface PortabilityFileUpload {
  sourceConsignmentEntityId: string;
  targetConsignmentEntityId: string;
  layout: 'CANONICAL_CSV' | 'BANK_X' | 'BANK_Y';
  content: string;
  fileName?: string;
}

export interface PortabilityUploadResult {
  fileId: string;
  status: string;
  detailCount: number;
  fileHash: string;
}

export interface PortabilityProcessResult {
  fileId: string;
  processed: number;
  matched: number;
  unmatched: number;
}

@Injectable({ providedIn: 'root' })
export class PortabilidadeService {
  private readonly http = inject(HttpClient);

  upload(input: PortabilityFileUpload) {
    return this.http.post<PortabilityUploadResult>(
      '/api/v1/payment/consignment-portability',
      input,
    );
  }

  process(fileId: string) {
    return this.http.post<PortabilityProcessResult>(
      `/api/v1/payment/consignment-portability/${fileId}/process`,
      {},
    );
  }
}
