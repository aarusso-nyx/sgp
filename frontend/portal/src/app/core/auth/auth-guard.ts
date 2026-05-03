import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { CognitoAuth } from './cognito-auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(CognitoAuth);
  if (auth.currentSession() || auth.accessToken()) {
    return true;
  }

  auth.startLogin();
  return false;
};
