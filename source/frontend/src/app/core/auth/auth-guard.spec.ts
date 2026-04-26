import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { vi } from 'vitest';

import { authGuard } from './auth-guard';
import { CognitoAuth } from './cognito-auth';

describe('authGuard', () => {
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

  it('allows navigation for an active session', () => {
    auth.currentSession.mockReturnValue({
      subject: '1',
      login: 'user',
      displayName: 'User',
      groups: [],
      permissions: [],
    });

    expect(executeGuard({} as never, {} as never)).toBe(true);
    expect(auth.startLogin).not.toHaveBeenCalled();
  });

  it('allows navigation when an access token exists', () => {
    auth.currentSession.mockReturnValue(null);
    auth.accessToken.mockReturnValue('jwt');

    expect(executeGuard({} as never, {} as never)).toBe(true);
  });

  it('starts login and blocks navigation without session state', () => {
    auth.currentSession.mockReturnValue(null);
    auth.accessToken.mockReturnValue(null);

    expect(executeGuard({} as never, {} as never)).toBe(false);
    expect(auth.startLogin).toHaveBeenCalled();
  });
});
