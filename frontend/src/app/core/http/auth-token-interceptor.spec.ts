import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { StynxSessionService } from '@stynx-web/angular-auth';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { authTokenInterceptor } from './auth-token-interceptor';

describe('authTokenInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => authTokenInterceptor(req, next));
  const session = {
    getAccessToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: StynxSessionService, useValue: session }],
    });
  });

  it('attaches the Stynx access token to HTTP calls', async () => {
    session.getAccessToken.mockResolvedValue('jwt-token');
    let forwardedRequest: HttpRequest<unknown> | undefined;

    await new Promise<void>((resolve) => {
      interceptor(new HttpRequest('GET', '/api/v1/auth/me'), (request) => {
        forwardedRequest = request;
        return of(new HttpResponse({ status: 200 }));
      }).subscribe(() => resolve());
    });

    expect(forwardedRequest?.headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('leaves requests unchanged when no token exists', async () => {
    session.getAccessToken.mockResolvedValue(null);
    let forwardedRequest: HttpRequest<unknown> | undefined;

    await new Promise<void>((resolve) => {
      interceptor(new HttpRequest('GET', '/api/v1/auth/me'), (request) => {
        forwardedRequest = request;
        return of(new HttpResponse({ status: 200 }));
      }).subscribe(() => resolve());
    });

    expect(forwardedRequest?.headers.has('Authorization')).toBe(false);
  });
});
