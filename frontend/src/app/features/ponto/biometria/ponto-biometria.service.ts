import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
  private readonly http = inject(HttpClient);

  listTemplates(employeeId?: string): Observable<BiometricTemplateSummary[]> {
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    return this.http.get<BiometricTemplateSummary[]>(`/api/v1/ponto/biometria/templates${query}`);
  }

  createConsent(payload: { employeeId: string; consentVersion: string }) {
    return this.http.post('/api/v1/ponto/biometria/consents', payload);
  }

  enroll(payload: {
    employeeId: string;
    kind: 'FINGERPRINT' | 'PALM_VEIN';
    sampleBase64: string;
    templateKmsKeyId: string;
    minimumQuality: number;
  }): Observable<BiometricTemplateSummary> {
    return this.http.post<BiometricTemplateSummary>('/api/v1/ponto/biometria/templates', payload);
  }

  withdraw(employeeId: string) {
    return this.http.delete(
      `/api/v1/ponto/biometria/employees/${encodeURIComponent(employeeId)}/consent`,
    );
  }
}
