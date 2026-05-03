import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

export interface RepDeviceSummary {
  repDeviceId: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C' | 'FINGERPRINT' | 'PALM_VEIN';
  serialNumber: string | null;
  employerTaxId: string;
  manufacturer: string | null;
  model: string | null;
  programHash: string | null;
  registeredAt: string;
  status: string;
}

export interface RepBatchSummary {
  batchId: string;
  repDeviceId: string;
  kind: 'REP_P' | 'REP_A' | 'REP_C' | 'FINGERPRINT' | 'PALM_VEIN';
  fileName: string | null;
  fileSha256: string;
  receivedAt: string;
  processedAt: string | null;
  status: string;
  errorSummary: Record<string, unknown>;
  acceptedLines: number;
  duplicateLines: number;
  createdTimeRecords: number;
}

@Injectable({ providedIn: 'root' })
export class PontoRepService {
  private readonly api = inject(ApiClient);

  listDevices(): Observable<RepDeviceSummary[]> {
    return this.api.get<RepDeviceSummary[]>('/api/v1/ponto/rep');
  }

  createDevice(payload: {
    kind: string;
    serialNumber?: string;
    employerTaxId: string;
    manufacturer?: string;
    model?: string;
    programHash?: string;
  }): Observable<RepDeviceSummary> {
    return this.api.post<RepDeviceSummary>('/api/v1/ponto/rep', payload);
  }

  listBatches(): Observable<RepBatchSummary[]> {
    return this.api.get<RepBatchSummary[]>('/api/v1/ponto/rep/batches');
  }

  uploadBatch(
    repDeviceId: string,
    payload: { fileName: string; content: string },
  ): Observable<RepBatchSummary> {
    return this.api.post<RepBatchSummary>(`/api/v1/ponto/rep/${repDeviceId}/batches`, payload);
  }

  originalUrl(batchId: string): string {
    return `/api/v1/ponto/rep/batches/${encodeURIComponent(batchId)}/original`;
  }
}
