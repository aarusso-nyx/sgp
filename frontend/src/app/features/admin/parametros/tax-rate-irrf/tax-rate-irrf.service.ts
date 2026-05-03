import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../../core/api/api-client';

export interface IrrfTaxRateBracket {
  id: string;
  code: string;
  name: string;
  competenceStart: string;
  competenceEnd: string | null;
  referenceYear: number;
  bracketMin: string;
  bracketMax: string | null;
  rate: string;
  deductionAmount: string;
  dependentDeduction: string;
  updatedAt: string;
}

export interface IrrfTaxRateImport {
  competenceStart: string;
  competenceEnd?: string | null;
  referenceYear: string;
  brackets: Array<{
    code: string;
    bracketMin: string;
    bracketMax?: string | null;
    rate: string;
    deductionAmount: string;
    dependentDeduction: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class TaxRateIrrfService {
  constructor(private readonly api: ApiClient) {}

  list(competence?: string): Observable<IrrfTaxRateBracket[]> {
    const url = '/api/v1/admin/parametros/tax-rate/irrf';
    return this.api.get<IrrfTaxRateBracket[]>(
      competence ? `${url}?competence=${encodeURIComponent(competence)}` : url,
    );
  }

  importTable(payload: IrrfTaxRateImport): Observable<IrrfTaxRateBracket[]> {
    return this.api.put<IrrfTaxRateBracket[]>('/api/v1/admin/parametros/tax-rate/irrf', payload);
  }
}
