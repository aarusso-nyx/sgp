import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { StynxSessionService } from '@stynx-web/angular-auth';

export const authGuard: CanActivateFn = async () => {
  const session = inject(StynxSessionService);
  if (session.snapshot().active) {
    return true;
  }

  const refreshed = await session.refresh().catch(() => null);
  if (refreshed || session.snapshot().active) {
    return true;
  }

  session.login();
  return false;
};
