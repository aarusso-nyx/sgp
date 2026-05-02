import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

export interface TceCatalogState {
  id: string;
  code: string;
  name: string;
  sphere: 'STATE' | 'FEDERAL_DISTRICT' | 'MUNICIPAL';
  parentStateCode: string | null;
  organKind: 'TCE' | 'TCM' | 'TCU';
  organName: string;
  organOfficialUrl: string;
}

export interface TceLayoutVersion {
  id: string;
  stateId: string;
  stateCode: string;
  systemName: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'RETIRED';
  publicationUrl: string;
  notes: string | null;
}

export interface TceLayoutField {
  id: string;
  layoutVersionId: string;
  fieldPath: string;
  dataType: string;
  required: boolean;
  maxLength: number | null;
  decimalPrecision: number | null;
  decimalScale: number | null;
  transformRule: string | null;
  sourceHint: string | null;
  ordering: number;
}

@Injectable({ providedIn: 'root' })
export class TceCatalogApiService {
  constructor(private readonly api: ApiClient) {}

  states(): Observable<TceCatalogState[]> {
    return this.api.get('v1/tce/states');
  }

  layouts(code: string): Observable<TceLayoutVersion[]> {
    return this.api.get(`v1/tce/states/${code}/layouts`);
  }

  fields(layoutId: string): Observable<TceLayoutField[]> {
    return this.api.get(`v1/tce/layouts/${layoutId}/fields`);
  }

  transition(layoutId: string, status: 'ACTIVE' | 'SUPERSEDED'): Observable<TceLayoutVersion> {
    return this.api.patch(`v1/tce/layouts/${layoutId}/status`, { status });
  }
}
