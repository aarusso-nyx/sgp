import { HttpHeaders, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { createTraceparent, traceContextInterceptor } from './trace-context-interceptor';

describe('traceContextInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => traceContextInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('adds a W3C traceparent header to frontend API calls', () => {
    const response = new HttpResponse({ status: 200 });
    const next = vi.fn((request: HttpRequest<unknown>) => {
      expect(request.headers.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
      return of(response);
    });

    interceptor(new HttpRequest('GET', '/api/v1/health'), next).subscribe();

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves an existing traceparent header supplied by the caller', () => {
    const incoming = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const response = new HttpResponse({ status: 200 });
    const next = vi.fn((request: HttpRequest<unknown>) => {
      expect(request.headers.get('traceparent')).toBe(incoming);
      return of(response);
    });

    interceptor(
      new HttpRequest('GET', '/api/v1/health', {
        headers: new HttpHeaders({ traceparent: incoming }),
      }),
      next,
    ).subscribe();

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('creates standards-shaped trace context values', () => {
    expect(createTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });
});
