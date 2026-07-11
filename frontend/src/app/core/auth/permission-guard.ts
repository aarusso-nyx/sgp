import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StynxSessionService } from '@stynx-nyx/angular-auth';

export const permissionGuard: CanActivateFn = (route) => {
  const session = inject(StynxSessionService);
  const router = inject(Router);
  const requiredPermissions = (route.data['permissions'] as string[] | undefined) ?? [];
  const requiredGroups = (route.data['groups'] as string[] | undefined) ?? [];
  const snapshot = session.snapshot();
  const groups = groupsFromClaims(snapshot.claims);
  const allowed =
    session.hasAllPermissions(requiredPermissions) &&
    requiredGroups.every((group) => groups.includes(group));

  return allowed ? true : router.parseUrl('/forbidden');
};

function groupsFromClaims(claims: Record<string, unknown> | null): string[] {
  const values = claims?.['groups'] ?? claims?.['cognito:groups'];
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string')
    : [];
}
