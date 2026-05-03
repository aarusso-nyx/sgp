import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { vi } from 'vitest';

import { authGuard } from './auth-guard';
import { CognitoAuth } from './cognito-auth';

describe('portal authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  const auth = {
    currentSession: vi.fn(),
    accessToken: vi.fn(),
    startLogin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: CognitoAuth, useValue: auth }],
    });
  });

  it('allows navigation for an active portal session', () => {
    auth.currentSession.mockReturnValue({ subject: 'server-1' });

    expect(executeGuard({} as never, {} as never)).toBe(true);
    expect(auth.startLogin).not.toHaveBeenCalled();
  });

  it('allows navigation when an access token exists', () => {
    auth.currentSession.mockReturnValue(null);
    auth.accessToken.mockReturnValue('jwt');

    expect(executeGuard({} as never, {} as never)).toBe(true);
    expect(auth.startLogin).not.toHaveBeenCalled();
  });

  it('starts Cognito login and blocks navigation when token is absent', () => {
    auth.currentSession.mockReturnValue(null);
    auth.accessToken.mockReturnValue(null);

    expect(executeGuard({} as never, {} as never)).toBe(false);
    expect(auth.startLogin).toHaveBeenCalledOnce();
  });
});
