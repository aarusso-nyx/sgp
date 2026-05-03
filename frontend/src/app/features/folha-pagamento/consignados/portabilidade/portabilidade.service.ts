import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../../core/api/api-client';

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
  private readonly api = inject(ApiClient);

  upload(input: PortabilityFileUpload) {
    return this.api.post<PortabilityUploadResult>('/api/v1/payment/consignment-portability', input);
  }

  process(fileId: string) {
    return this.api.post<PortabilityProcessResult>(
      `/api/v1/payment/consignment-portability/${fileId}/process`,
      {},
    );
  }
}
