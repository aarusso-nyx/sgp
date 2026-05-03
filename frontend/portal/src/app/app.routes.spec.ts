import { Route } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { routes } from './app.routes';

describe('portal routes', () => {
  it('registers authGuard on every portal route', () => {
    const assertGuarded = (route: Route): void => {
      expect(route.canActivate).toContain(authGuard);
      route.children?.forEach(assertGuarded);
    };

    routes.forEach(assertGuarded);
  });
});
