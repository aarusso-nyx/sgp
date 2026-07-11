import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { StynxSessionService } from '@stynx-nyx/angular-auth';
import { vi } from 'vitest';

import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  const session = {
    snapshot: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: StynxSessionService, useValue: session }],
    });
  });

  it('allows navigation for an active session', async () => {
    session.snapshot.mockReturnValue({ active: true });

    await expect(executeGuard({} as never, {} as never)).resolves.toBe(true);
    expect(session.refresh).not.toHaveBeenCalled();
    expect(session.login).not.toHaveBeenCalled();
  });

  it('allows navigation after refreshing a stored Stynx session', async () => {
    session.snapshot.mockReturnValue({ active: false });
    session.refresh.mockResolvedValue('admin-token');

    await expect(executeGuard({} as never, {} as never)).resolves.toBe(true);
    expect(session.login).not.toHaveBeenCalled();
  });

  it('starts login and blocks navigation without session state', async () => {
    session.snapshot.mockReturnValue({ active: false });
    session.refresh.mockResolvedValue(null);

    await expect(executeGuard({} as never, {} as never)).resolves.toBe(false);
    expect(session.login).toHaveBeenCalled();
  });
});
