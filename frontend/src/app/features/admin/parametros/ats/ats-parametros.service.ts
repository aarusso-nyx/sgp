import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

  constructor(private readonly http: HttpClient) {}

  list(): Observable<AtsParameterTable> {
    return this.http.get<AtsParameterTable>(this.url);
  }

  upsert(payload: {
    key: AtsParameterKey;
    value: string;
    description?: string;
  }): Observable<AtsParameterTable> {
    return this.http.put<AtsParameterTable>(this.url, payload);
  }
}
