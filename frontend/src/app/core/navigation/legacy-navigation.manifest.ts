import {
  ADMIN_FEATURES,
  ADMIN_FEATURES_BY_MODULE,
  ADMIN_NAVIGATION_SECTIONS,
} from './admin-feature-catalog';
import {
  LegacyModuleKey,
  LegacyModuleRouteEntry,
  LegacyNavigationItem,
  LegacyNavigationSection,
} from './legacy-navigation.types';

export const LEGACY_NAVIGATION_MANIFEST: LegacyNavigationSection[] = ADMIN_NAVIGATION_SECTIONS.map(
  (section) => ({
    ...section,
    status: 'inferred',
    items: section.items.map(toNavigationItem),
  }),
);

export const LEGACY_MODULE_ROUTES: Record<LegacyModuleKey, LegacyModuleRouteEntry[]> =
  Object.fromEntries(
    Object.entries(ADMIN_FEATURES_BY_MODULE).map(([moduleKey, features]) => [
      moduleKey,
      features.map(toRouteEntry),
    ]),
  ) as Record<LegacyModuleKey, LegacyModuleRouteEntry[]>;

export function moduleChildPaths(moduleKey: LegacyModuleKey): string[] {
  return LEGACY_MODULE_ROUTES[moduleKey]
    .map((entry) => entry.childPath)
    .filter((path, index, all) => Boolean(path) && all.indexOf(path) === index);
}

export function findNavigationItemByRoutePath(routePath: string) {
  for (const section of LEGACY_NAVIGATION_MANIFEST) {
    const item = section.items.find((candidate) => candidate.routePath === routePath);
    if (item) {
      return item;
    }
  }

  return undefined;
}

function toNavigationItem(feature: (typeof ADMIN_FEATURES)[number]): LegacyNavigationItem {
  return {
    id: feature.id,
    label: feature.label,
    menuPath: [feature.moduleLabel, feature.sectionLabel, feature.label].filter(Boolean),
    moduleLabel: feature.moduleLabel,
    moduleKey: feature.moduleKey,
    legacyRoute: feature.routePath,
    routePath: feature.routePath,
    status: 'inferred',
    evidence: ['docs/eng/50-arvore-menus.md'],
    requiredPermissions: feature.requiredPermissions,
    requiredGroups: [],
    featureFlag: feature.featureFlag,
    requiredRole: feature.requiredRole,
  };
}

function toRouteEntry(feature: (typeof ADMIN_FEATURES)[number]): LegacyModuleRouteEntry {
  return {
    id: feature.id,
    moduleLabel: feature.moduleLabel,
    moduleKey: feature.moduleKey,
    legacyRoute: feature.routePath,
    childPath: feature.childPath,
    routePath: feature.routePath,
    status: 'inferred',
    access: feature.requiredRole,
    evidence: ['docs/eng/50-arvore-menus.md'],
    requiredPermissions: feature.requiredPermissions,
    requiredGroups: [],
    featureFlag: feature.featureFlag,
    requiredRole: feature.requiredRole,
  };
}
