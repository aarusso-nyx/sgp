import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PagedResult } from '../../../core/models/paged-result';

export interface MasterDataField {
  key: string;
  label: string;
  type: 'text' | 'boolean' | 'number';
  required: boolean;
  maxLength?: number;
}

export interface MasterDataColumn {
  key: string;
  label: string;
}

export interface MasterDataResource {
  key: string;
  label: string;
  module: string;
  route: string;
  status: 'observed' | 'inferred' | 'unverified';
  observedActions: string[];
  fields: MasterDataField[];
  columns: MasterDataColumn[];
}

export interface MasterDataRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  status: 'observed' | 'inferred' | 'unverified';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MasterDataMutation {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MasterDataQuery extends Record<string, string | number | boolean | undefined> {
  page?: number;
  pageSize?: number;
  search?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MasterData {
  constructor(private readonly http: HttpClient) {}

  listResources(query: MasterDataQuery = {}): Observable<PagedResult<MasterDataResource>> {
    return this.http.get<PagedResult<MasterDataResource>>('/api/v1/master-data', {
      params: this.params(query),
    });
  }

  listRecords(
    resource: string,
    query: MasterDataQuery = {},
  ): Observable<PagedResult<MasterDataRecord>> {
    return this.http.get<PagedResult<MasterDataRecord>>(`/api/v1/master-data/${resource}`, {
      params: this.params(query),
    });
  }

  createRecord(resource: string, body: MasterDataMutation): Observable<MasterDataRecord> {
    return this.http.post<MasterDataRecord>(`/api/v1/master-data/${resource}`, body);
  }

  updateRecord(
    resource: string,
    id: string,
    body: MasterDataMutation,
  ): Observable<MasterDataRecord> {
    return this.http.patch<MasterDataRecord>(`/api/v1/master-data/${resource}/${id}`, body);
  }

  deactivateRecord(resource: string, id: string): Observable<MasterDataRecord> {
    return this.http.delete<MasterDataRecord>(`/api/v1/master-data/${resource}/${id}`);
  }

  private params(query: MasterDataQuery): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
