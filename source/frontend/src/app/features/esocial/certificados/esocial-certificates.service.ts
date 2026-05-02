import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  constructor(private readonly http: HttpClient) {}

  list(): Observable<ESocialCertificate[]> {
    return this.http.get<ESocialCertificate[]>('/api/v1/esocial/certificados');
  }

  upload(payload: ESocialCertificatePayload): Observable<ESocialCertificate> {
    return this.http.post<ESocialCertificate>('/api/v1/esocial/certificados', payload);
  }

  rotate(
    certificateId: string,
    payload: ESocialCertificatePayload,
  ): Observable<ESocialCertificate> {
    return this.http.put<ESocialCertificate>(
      `/api/v1/esocial/certificados/${certificateId}/rotacao`,
      payload,
    );
  }
}
