import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface FaceTemplateSummary {
  id: string;
  employeeId: string;
  modelId: string;
  modelVersion: string;
  capturedAt: string;
  status: string;
}

export interface FaceThresholdConfig {
  threshold: string;
  livenessRequired: boolean;
}

export interface FaceFramePayload {
  imageBase64: string;
  blinkDetected: boolean;
  yawDegrees: number;
}

@Injectable({ providedIn: 'root' })
export class FaceAdminService {
  private readonly http = inject(HttpClient);

  listTemplates(employeeId?: string): Observable<FaceTemplateSummary[]> {
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    return this.http.get<FaceTemplateSummary[]>(`/api/v1/ponto/face/templates${query}`);
  }

  threshold(): Observable<FaceThresholdConfig> {
    return this.http.get<FaceThresholdConfig>('/api/v1/ponto/face/threshold');
  }

  updateThreshold(payload: { threshold: number; livenessRequired: boolean }) {
    return this.http.put('/api/v1/ponto/face/threshold', payload);
  }

  createConsent(payload: { employeeId: string; consentVersion: string }) {
    return this.http.post('/api/v1/ponto/face/consents', payload);
  }

  enroll(payload: {
    employeeId: string;
    frames: FaceFramePayload[];
    templateKmsKeyId: string;
  }): Observable<FaceTemplateSummary> {
    return this.http.post<FaceTemplateSummary>('/api/v1/ponto/face/templates', payload);
  }

  status(employeeId: string) {
    return this.http.get(`/api/v1/ponto/face/employees/${encodeURIComponent(employeeId)}/status`);
  }

  withdraw(employeeId: string) {
    return this.http.delete(`/api/v1/ponto/face/employees/${encodeURIComponent(employeeId)}/consent`);
  }
}
