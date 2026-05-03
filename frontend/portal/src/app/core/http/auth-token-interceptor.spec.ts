import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CognitoAuth } from '../auth/cognito-auth';
import { authTokenInterceptor } from './auth-token-interceptor';

describe('portal authTokenInterceptor', () => {
  const auth = {
    accessToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: CognitoAuth, useValue: auth }],
    });
  });

  it('attaches the Cognito JWT to portal HTTP calls', () => {
    auth.accessToken.mockReturnValue('jwt-token');
    let forwardedRequest: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() =>
      authTokenInterceptor(new HttpRequest('GET', '/api/v1/portal/me'), (request) => {
        forwardedRequest = request;
        return of(new HttpResponse({ status: 200 }));
      }),
    ).subscribe();

    expect(forwardedRequest?.headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('leaves requests unchanged when no token exists', () => {
    auth.accessToken.mockReturnValue(null);
    let forwardedRequest: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() =>
      authTokenInterceptor(new HttpRequest('GET', '/api/v1/portal/me'), (request) => {
        forwardedRequest = request;
        return of(new HttpResponse({ status: 200 }));
      }),
    ).subscribe();

    expect(forwardedRequest?.headers.has('Authorization')).toBe(false);
  });
});
