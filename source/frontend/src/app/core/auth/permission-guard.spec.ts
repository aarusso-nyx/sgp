import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { permissionGuard } from './permission-guard';
import { Permission } from './permission';

describe('permissionGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => permissionGuard(...guardParameters));

  const permission = {
    allows: vi.fn(),
  };

  let router: Router;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Permission, useValue: permission },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation when requirements pass', () => {
    permission.allows.mockReturnValue(true);

    const result = executeGuard({ data: { permissions: ['x'] } } as never, {} as never);

    expect(result).toBe(true);
    expect(permission.allows).toHaveBeenCalledWith({
      requiredPermissions: ['x'],
      requiredGroups: [],
    });
  });

  it('redirects to forbidden when requirements fail', () => {
    permission.allows.mockReturnValue(false);

    const result = executeGuard({ data: { groups: ['admins'] } } as never, {} as never) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/forbidden');
  });
});
