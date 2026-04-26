import { Type } from '@angular/core';
import { Route, Routes } from '@angular/router';

import { permissionGuard } from '../auth/permission-guard';
import { LEGACY_MODULE_ROUTES } from './legacy-navigation.manifest';
import type { LegacyModuleKey } from './legacy-navigation.types';

export function buildModuleRouteGroup(
  moduleKey: LegacyModuleKey,
  component: Type<unknown>,
  fallbackData: Record<string, unknown>,
): Routes {
  const routes: Routes = [
    {
      path: '',
      component,
      canActivate: [permissionGuard],
      data: {
        moduleKey,
        permissions: [],
        groups: [],
        ...fallbackData,
      },
    },
  ];

  for (const entry of LEGACY_MODULE_ROUTES[moduleKey]) {
    if (!entry.childPath) {
      continue;
    }

    routes.push(
      routeForEntry(moduleKey, entry.childPath, component, {
        featureRoutePath: entry.routePath,
        requiredRole: entry.requiredRole,
        featureFlag: entry.featureFlag,
        legacyRoute: entry.legacyRoute,
        permissions: entry.requiredPermissions ?? [],
        groups: entry.requiredGroups ?? [],
      }),
    );
  }

  routes.push({
    path: '**',
    component,
    data: {
      moduleKey,
      unknownRoute: true,
      ...fallbackData,
    },
  });

  return dedupeByPath(routes);
}

function routeForEntry(
  moduleKey: LegacyModuleKey,
  childPath: string,
  component: Type<unknown>,
  data: Record<string, unknown>,
): Route {
  return {
    path: childPath,
    component,
    canActivate: [permissionGuard],
    data: {
      moduleKey,
      legacyChildPath: childPath,
      ...data,
    },
  };
}

function dedupeByPath(routes: Routes): Routes {
  const knownPaths = new Set<string>();
  const deduped: Routes = [];

  for (const route of routes) {
    const path = route.path ?? '';
    if (knownPaths.has(path)) {
      continue;
    }
    knownPaths.add(path);
    deduped.push(route);
  }

  return deduped;
}
