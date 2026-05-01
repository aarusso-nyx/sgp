import { SetMetadata } from '@nestjs/common';

import type { Permission } from '../permissions/permission-catalog.generated';

export const REQUIRED_PERMISSIONS = 'requiredPermissions';
export const IS_PUBLIC_ROUTE = 'isPublicRoute';

export const RequirePermission = (permissions: Permission | Permission[]) =>
  SetMetadata(
    REQUIRED_PERMISSIONS,
    Array.isArray(permissions) ? permissions : [permissions],
  );

export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);
