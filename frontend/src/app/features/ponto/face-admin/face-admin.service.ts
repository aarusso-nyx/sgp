import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

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
  private readonly api = inject(ApiClient);

  listTemplates(employeeId?: string): Observable<FaceTemplateSummary[]> {
    return this.api.get<FaceTemplateSummary[]>('v1/ponto/face/templates', { employeeId });
  }

  threshold(): Observable<FaceThresholdConfig> {
    return this.api.get<FaceThresholdConfig>('v1/ponto/face/threshold');
  }

  updateThreshold(payload: { threshold: number; livenessRequired: boolean }) {
    return this.api.put('v1/ponto/face/threshold', payload);
  }

  createConsent(payload: { employeeId: string; consentVersion: string }) {
    return this.api.post('v1/ponto/face/consents', payload);
  }

  enroll(payload: {
    employeeId: string;
    frames: FaceFramePayload[];
    templateKmsKeyId: string;
  }): Observable<FaceTemplateSummary> {
    return this.api.post<FaceTemplateSummary, typeof payload>('v1/ponto/face/templates', payload);
  }

  status(employeeId: string) {
    return this.api.get<unknown>(
      `v1/ponto/face/employees/${encodeURIComponent(employeeId)}/status`,
    );
  }

  withdraw(employeeId: string) {
    return this.api.delete<unknown>(
      `v1/ponto/face/employees/${encodeURIComponent(employeeId)}/consent`,
    );
  }
}
