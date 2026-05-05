import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree, provideRouter } from '@angular/router';
import { StynxSessionService } from '@stynx-web/angular-auth';
import { vi } from 'vitest';

import { permissionGuard } from './permission-guard';

describe('permissionGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => permissionGuard(...guardParameters));

  const session = {
    hasAllPermissions: vi.fn(),
    snapshot: vi.fn(),
  };

  let router: Router;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: StynxSessionService, useValue: session }],
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation when requirements pass', () => {
    session.hasAllPermissions.mockReturnValue(true);
    session.snapshot.mockReturnValue({ claims: { groups: [] } });

    const result = executeGuard({ data: { permissions: ['x'] } } as never, {} as never);

    expect(result).toBe(true);
    expect(session.hasAllPermissions).toHaveBeenCalledWith(['x']);
  });

  it('redirects to forbidden when requirements fail', () => {
    session.hasAllPermissions.mockReturnValue(true);
    session.snapshot.mockReturnValue({ claims: { groups: ['auditor'] } });

    const result = executeGuard({ data: { groups: ['admins'] } } as never, {} as never) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/forbidden');
  });
});
