import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface AudespSubmission {
  id: string;
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  status: string;
  envelopeHash: string | null;
  requestSizeBytes: number | null;
  validationErrors: Array<{ fieldPath: string; code: string; message: string }>;
  responsePayload: Record<string, unknown>;
  submittedAt: string | null;
  responseAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AudespSpApiService {
  constructor(private readonly api: ApiClient) {}

  list(year?: number, month?: number): Observable<AudespSubmission[]> {
    const query = new URLSearchParams();
    if (year) query.set('year', String(year));
    if (month) query.set('month', String(month));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.api.get(`v1/tce/audesp-sp/submissions${suffix}`);
  }

  create(payrollRunId: string): Observable<AudespSubmission> {
    return this.api.post('v1/tce/audesp-sp/submissions', { payrollRunId });
  }

  validate(id: string): Observable<AudespSubmission> {
    return this.api.post(`v1/tce/audesp-sp/submissions/${id}/validate`, {});
  }

  submit(id: string): Observable<AudespSubmission> {
    return this.api.post(`v1/tce/audesp-sp/submissions/${id}/submit`, {});
  }

  envelopeUrl(id: string): string {
    const config = (window as unknown as { SGP_CONFIG?: Record<string, string> }).SGP_CONFIG;
    const baseUrl = (config?.['API_BASE_URL'] ?? '').replace(/\/$/, '');
    const basePath = (config?.['API_BASE_PATH'] ?? '/api').replace(/\/$/, '');
    return `${baseUrl}${basePath}/v1/tce/audesp-sp/submissions/${id}/envelope.xml`;
  }
}
