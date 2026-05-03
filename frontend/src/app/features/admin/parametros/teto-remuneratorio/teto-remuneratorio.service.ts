import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../../core/api/api-client';

export type RemunerationCeilingKey =
  | 'TETO_PREFEITURA'
  | 'TETO_VICE'
  | 'TETO_VEREADOR'
  | 'TETO_SECRETARIO';

export interface RemunerationCeiling {
  key: RemunerationCeilingKey;
  amount: string | null;
  description: string;
  updatedAt: string | null;
}

export interface RemunerationCeilingTable {
  items: RemunerationCeiling[];
  immuneFlag: string;
}

@Injectable({ providedIn: 'root' })
export class TetoRemuneratorioService {
  private readonly url = '/api/v1/admin/parametros/teto-remuneratorio';

  constructor(private readonly api: ApiClient) {}

  list(): Observable<RemunerationCeilingTable> {
    return this.api.get<RemunerationCeilingTable>(this.url);
  }

  upsert(payload: {
    key: RemunerationCeilingKey;
    amount: string;
    description?: string;
  }): Observable<RemunerationCeilingTable> {
    return this.api.put<RemunerationCeilingTable>(this.url, payload);
  }
}
