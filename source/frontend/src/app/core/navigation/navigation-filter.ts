import { Injectable } from '@angular/core';

import { UserSession } from '../models/user-session';
import {
  LEGACY_MODULE_ROUTES,
  LEGACY_NAVIGATION_MANIFEST,
} from './legacy-navigation.manifest';
import {
  LegacyModuleKey,
  LegacyModuleRouteEntry,
  LegacyNavigationSection,
} from './legacy-navigation.types';

export interface AccessRequirements {
  requiredPermissions?: string[];
  requiredGroups?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class NavigationFilter {
  visibleSections(session: UserSession | null): LegacyNavigationSection[] {
    return LEGACY_NAVIGATION_MANIFEST.map((section) => ({
      ...section,
      items: section.items.filter((item) => this.canAccess(item, session)),
    })).filter((section) => section.items.length > 0);
  }

  visibleModuleRoutes(
    moduleKey: LegacyModuleKey,
    session: UserSession | null,
  ): LegacyModuleRouteEntry[] {
    return LEGACY_MODULE_ROUTES[moduleKey].filter((entry) => this.canAccess(entry, session));
  }

  canAccess(requirements: AccessRequirements, session: UserSession | null): boolean {
    const requiredPermissions = requirements.requiredPermissions ?? [];
    const requiredGroups = requirements.requiredGroups ?? [];

    if (!requiredPermissions.length && !requiredGroups.length) {
      return true;
    }

    if (!session) {
      return false;
    }

    const hasPermissions = requiredPermissions.every((permission) =>
      session.permissions.includes(permission),
    );
    const hasGroups = requiredGroups.every((group) => session.groups.includes(group));

    return hasPermissions && hasGroups;
  }
}
