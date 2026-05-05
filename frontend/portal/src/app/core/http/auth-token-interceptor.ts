import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StynxSessionService } from '@stynx-web/angular-auth';
import { from, switchMap } from 'rxjs';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(StynxSessionService);

  return from(session.getAccessToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      return next(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
    }),
  );
};
