import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';

export interface ESocialCertificate {
  certificateId: string;
  alias: string;
  kind: 'A1' | 'A3';
  validFrom: string;
  validTo: string;
  rotatedAt: string | null;
  rotationDueAt: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiresInDays: number;
  expiresSoon: boolean;
}

export interface ESocialCertificatePayload {
  alias: string;
  kind: 'A1' | 'A3';
  pkcs12Base64: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class ESocialCertificatesService {
  constructor(private readonly api: ApiClient) {}

  list(): Observable<ESocialCertificate[]> {
    return this.api.get<ESocialCertificate[]>('/api/v1/esocial/certificados');
  }

  upload(payload: ESocialCertificatePayload): Observable<ESocialCertificate> {
    return this.api.post<ESocialCertificate>('/api/v1/esocial/certificados', payload);
  }

  rotate(
    certificateId: string,
    payload: ESocialCertificatePayload,
  ): Observable<ESocialCertificate> {
    return this.api.put<ESocialCertificate>(
      `/api/v1/esocial/certificados/${certificateId}/rotacao`,
      payload,
    );
  }
}
