import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiClient {
  constructor(private readonly http: HttpClient) {}

  get<T>(
    path: string,
    query: Record<string, string | number | boolean | undefined> = {},
  ): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.paramsFrom(query) });
  }

  post<T, TBody extends object>(path: string, body: TBody): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T, TBody extends object>(path: string, body: TBody): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T, TBody extends object>(path: string, body: TBody): Observable<T> {
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
    const basePath = (config?.['API_BASE_PATH'] ?? '/api').replace(/\/$/, '');
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    return `${normalizedBaseUrl}${basePath}/${path.replace(/^\//, '')}`;
  }

  private paramsFrom(query: Record<string, string | number | boolean | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === '') {
        continue;
      }
      params = params.set(key, String(value));
    }
    return params;
  }
}
