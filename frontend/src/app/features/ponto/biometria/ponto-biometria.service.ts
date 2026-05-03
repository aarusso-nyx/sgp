import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface BiometricTemplateSummary {
  id: string;
  employeeId: string;
  kind: 'FINGERPRINT' | 'PALM_VEIN';
  qualityScore: string;
  capturedAt: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class PontoBiometriaService {
  private readonly api = inject(ApiClient);

  listTemplates(employeeId?: string): Observable<BiometricTemplateSummary[]> {
    return this.api.get<BiometricTemplateSummary[]>('v1/ponto/biometria/templates', {
      employeeId,
    });
  }

  createConsent(payload: { employeeId: string; consentVersion: string }) {
    return this.api.post('v1/ponto/biometria/consents', payload);
  }

  enroll(payload: {
    employeeId: string;
    kind: 'FINGERPRINT' | 'PALM_VEIN';
    sampleBase64: string;
    templateKmsKeyId: string;
    minimumQuality: number;
  }): Observable<BiometricTemplateSummary> {
    return this.api.post<BiometricTemplateSummary, typeof payload>(
      'v1/ponto/biometria/templates',
      payload,
    );
  }

  withdraw(employeeId: string) {
    return this.api.delete<unknown>(
      `v1/ponto/biometria/employees/${encodeURIComponent(employeeId)}/consent`,
    );
  }
}
