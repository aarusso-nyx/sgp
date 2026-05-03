import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { CognitoAuth } from '../auth/cognito-auth';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(CognitoAuth).accessToken();
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
};
