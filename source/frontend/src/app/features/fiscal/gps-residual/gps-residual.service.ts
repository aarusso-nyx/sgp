import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export type GpsReason = 'TRANSITION' | 'RETROACTIVE' | 'MALHA_FINA';
export type GpsStatus = 'DRAFT' | 'GENERATED' | 'PAID' | 'CANCELLED';

export interface GpsPaymentCode {
  id: string;
  code: string;
  description: string;
  appliesTo: string;
  active: boolean;
  validFrom: string;
  validTo: string | null;
}

export interface GpsRemittance {
  id: string;
  competence: string;
  paymentCodeId: string;
  paymentCode: string;
  paymentCodeDescription: string;
  reason: GpsReason;
  reasonDetail: string;
  baseAmount: string;
  amount: string;
  interestAmount: string;
  fineAmount: string;
  totalAmount: string;
  status: GpsStatus;
  fileUri: string | null;
  txtHash: string;
  generatedAt: string;
  paidAt: string | null;
}

export interface GenerateGpsRequest {
  competence: string;
  paymentCodeId: string;
  reason: GpsReason;
  reasonDetail: string;
}

@Injectable({ providedIn: 'root' })
export class GpsResidualApiService {
  constructor(private readonly api: ApiClient) {}

  paymentCodes(): Observable<GpsPaymentCode[]> {
    return this.api.get('v1/admin/fiscal/gps/payment-codes');
  }

  list(reason?: GpsReason | '', status?: GpsStatus | ''): Observable<GpsRemittance[]> {
    return this.api.get('v1/admin/fiscal/gps', {
      reason: reason || undefined,
      status: status || undefined,
    });
  }

  generate(input: GenerateGpsRequest): Observable<GpsRemittance> {
    return this.api.post('v1/admin/fiscal/gps', input);
  }
}
