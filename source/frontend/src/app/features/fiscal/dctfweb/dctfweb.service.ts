import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface DctfwebItem {
  id: string;
  sourceEvent: string;
  sourceRunId: string;
  debitCode: string;
  baseAmount: string;
  amount: string;
}

export interface DctfwebDeclaration {
  id: string;
  competence: string;
  kind: string;
  status: string;
  originalDeclarationId: string | null;
  payloadXmlRef: string;
  payloadXmlHash: string;
  signedXmlRef: string | null;
  signedXmlHash: string | null;
  transmittedXmlHash: string | null;
  receiptNumber: string | null;
  receiptAt: string | null;
  itemCount: number;
  totalBaseAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  items?: DctfwebItem[];
}

export interface GenerateDctfwebRequest {
  year: number;
  month: number;
  kind: 'ORIGINAL' | 'RETIFICADORA';
  originalDeclarationId?: string;
}

@Injectable({ providedIn: 'root' })
export class DctfwebApiService {
  constructor(private readonly api: ApiClient) {}

  list(year: number, month: number): Observable<DctfwebDeclaration[]> {
    return this.api.get('v1/admin/fiscal/dctfweb', { year, month });
  }

  generate(input: GenerateDctfwebRequest): Observable<DctfwebDeclaration> {
    return this.api.post('v1/admin/fiscal/dctfweb/gerar', input);
  }

  sign(id: string): Observable<DctfwebDeclaration> {
    return this.api.post(`v1/admin/fiscal/dctfweb/${id}/assinar`, {});
  }

  transmit(id: string): Observable<DctfwebDeclaration> {
    return this.api.post(`v1/admin/fiscal/dctfweb/${id}/transmitir`, {});
  }
}
