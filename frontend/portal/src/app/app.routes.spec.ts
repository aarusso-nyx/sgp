import { Route } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { routes } from './app.routes';

describe('portal routes', () => {
  it('keeps the OIDC callback public', () => {
    expect(routes.find((route) => route.path === 'auth/callback')?.canActivate).toBeUndefined();
  });

  it('registers authGuard on every portal application route', () => {
    const assertGuarded = (route: Route): void => {
      expect(route.canActivate).toContain(authGuard);
      route.children?.forEach(assertGuarded);
    };

    routes.filter((route) => route.path !== 'auth/callback').forEach(assertGuarded);
  });
});
