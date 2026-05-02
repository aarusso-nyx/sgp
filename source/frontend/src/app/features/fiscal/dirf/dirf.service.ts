import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface DirfBeneficiary {
  id: string;
  cpfCnpj: string;
  kind: string;
  name: string;
  totals: Record<string, unknown>;
}

export interface DirfArquivo {
  id: string;
  yearBase: number;
  kind: string;
  status: string;
  originalArquivoId: string | null;
  txtRef: string;
  txtHash: string;
  layoutVersion: string;
  generatedAt: string | null;
  beneficiaryCount: number;
  paymentCount: number;
  totalAmount: string;
  totalIrrf: string;
  beneficiaries?: DirfBeneficiary[];
}

export interface GenerateDirfRequest {
  yearBase: number;
  kind: 'ORIGINAL' | 'RETIFICADORA';
  originalArquivoId?: string;
}

@Injectable({ providedIn: 'root' })
export class DirfApiService {
  constructor(private readonly api: ApiClient) {}

  list(yearBase: number): Observable<DirfArquivo[]> {
    return this.api.get('v1/admin/fiscal/dirf', { yearBase });
  }

  generate(input: GenerateDirfRequest): Observable<DirfArquivo> {
    return this.api.post('v1/admin/fiscal/dirf/gerar', input);
  }
}
