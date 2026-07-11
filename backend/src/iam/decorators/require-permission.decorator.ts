import { applyDecorators, SetMetadata } from '@nestjs/common';
import { RequirePermissions } from '@stynx-nyx/backend';
import { Public as StynxPublic } from '@stynx-nyx/auth';

import type { Permission } from '../permissions/permission-catalog.generated';

export const REQUIRED_PERMISSIONS = 'requiredPermissions';
export const IS_PUBLIC_ROUTE = 'isPublicRoute';

export const RequirePermission = (permissions: Permission | Permission[]) => {
  const required = Array.isArray(permissions) ? permissions : [permissions];
  return applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS, required),
    RequirePermissions(required),
  );
};

export const Public = () =>
  applyDecorators(SetMetadata(IS_PUBLIC_ROUTE, true), StynxPublic());
