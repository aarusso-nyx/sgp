import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RppsTaxRateBracket {
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

export interface RppsTaxRateTable {
  ceilingAmount: string | null;
  brackets: RppsTaxRateBracket[];
}

export interface RppsTaxRateImport {
  competenceStart: string;
  competenceEnd?: string | null;
  referenceYear: string;
  ceilingAmount?: string | null;
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
export class TaxRateRppsService {
  private readonly url = '/api/v1/admin/parametros/tax-rate/rpps';

  constructor(private readonly http: HttpClient) {}

  list(competence?: string): Observable<RppsTaxRateTable> {
    return this.http.get<RppsTaxRateTable>(
      competence ? `${this.url}?competence=${encodeURIComponent(competence)}` : this.url,
    );
  }

  importTable(payload: RppsTaxRateImport): Observable<RppsTaxRateTable> {
    return this.http.put<RppsTaxRateTable>(this.url, payload);
  }
}
