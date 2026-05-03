import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../../core/api/api-client';

export type AtsParameterKey =
  | 'ATS_PERCENT_PER_YEAR'
  | 'TRIENIO_PERCENT_PER_PERIOD'
  | 'QUINQUENIO_PERCENT_PER_PERIOD'
  | 'SEXTA_PARTE_SERVICE_YEARS'
  | 'SEXTA_PARTE_FRACTION';

export interface AtsParameter {
  key: AtsParameterKey;
  value: string;
  description: string;
  updatedAt: string | null;
}

export interface AtsParameterTable {
  items: AtsParameter[];
}

@Injectable({ providedIn: 'root' })
export class AtsParametrosService {
  private readonly url = '/api/v1/admin/parametros/ats';

  constructor(private readonly api: ApiClient) {}

  list(): Observable<AtsParameterTable> {
    return this.api.get<AtsParameterTable>(this.url);
  }

  upsert(payload: {
    key: AtsParameterKey;
    value: string;
    description?: string;
  }): Observable<AtsParameterTable> {
    return this.api.put<AtsParameterTable>(this.url, payload);
  }
}
