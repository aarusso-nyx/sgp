import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Permission } from './permission';

export const permissionGuard: CanActivateFn = (route) => {
  const permission = inject(Permission);
  const router = inject(Router);

  const allowed = permission.allows({
    requiredPermissions: (route.data['permissions'] as string[] | undefined) ?? [],
    requiredGroups: (route.data['groups'] as string[] | undefined) ?? [],
  });

  return allowed ? true : router.parseUrl('/forbidden');
};
