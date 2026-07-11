import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { StynxSessionService } from '@stynx-nyx/angular-auth';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { authTokenInterceptor } from './auth-token-interceptor';

describe('portal authTokenInterceptor', () => {
  const session = {
    getAccessToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: StynxSessionService, useValue: session }],
    });
  });

  it('attaches the Stynx access token to portal HTTP calls', async () => {
    session.getAccessToken.mockResolvedValue('jwt-token');
    let forwardedRequest: HttpRequest<unknown> | undefined;

    await new Promise<void>((resolve) => {
      TestBed.runInInjectionContext(() =>
        authTokenInterceptor(new HttpRequest('GET', '/api/v1/portal/me'), (request) => {
          forwardedRequest = request;
          return of(new HttpResponse({ status: 200 }));
        }),
      ).subscribe(() => resolve());
    });

    expect(forwardedRequest?.headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('leaves requests unchanged when no token exists', async () => {
    session.getAccessToken.mockResolvedValue(null);
    let forwardedRequest: HttpRequest<unknown> | undefined;

    await new Promise<void>((resolve) => {
      TestBed.runInInjectionContext(() =>
        authTokenInterceptor(new HttpRequest('GET', '/api/v1/portal/me'), (request) => {
          forwardedRequest = request;
          return of(new HttpResponse({ status: 200 }));
        }),
      ).subscribe(() => resolve());
    });

    expect(forwardedRequest?.headers.has('Authorization')).toBe(false);
  });
});
