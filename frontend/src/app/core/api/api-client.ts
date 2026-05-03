import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PagedResult } from '../models/paged-result';

type ApiQueryValue = string | number | boolean | undefined;
type ApiQueryInput =
  | Record<string, ApiQueryValue>
  | {
      params?: HttpParams | Record<string, ApiQueryValue>;
    };

@Injectable({
  providedIn: 'root',
})
export class ApiClient {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, query: ApiQueryInput = {}): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.paramsFrom(query) });
  }

  list<T>(path: string, query: ApiQueryInput = {}): Observable<PagedResult<T>> {
    return this.http.get<PagedResult<T>>(this.url(path), {
      params: this.paramsFrom(query),
    });
  }

  post<T, TBody extends object = object>(path: string, body: TBody): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T, TBody extends object = object>(path: string, body: TBody): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T, TBody extends object = object>(path: string, body: TBody): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    if (/^https?:\/\//.test(path)) {
      return path;
    }

    const config = (window as unknown as { SGP_CONFIG?: Record<string, string> }).SGP_CONFIG;
    const baseUrl = config?.['API_BASE_URL'] ?? '';
    if (path.startsWith('/api/')) {
      return `${baseUrl.replace(/\/$/, '')}${path}`;
    }

    const basePath = (config?.['API_BASE_PATH'] ?? '/api').replace(/\/$/, '');
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    return `${normalizedBaseUrl}${basePath}/${path.replace(/^\//, '')}`;
  }

  private paramsFrom(query: ApiQueryInput): HttpParams {
    if ('params' in query && query.params instanceof HttpParams) {
      return query.params;
    }

    const values = 'params' in query && query.params ? query.params : query;
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === '') {
        continue;
      }
      params = params.set(key, String(value));
    }
    return params;
  }
}
