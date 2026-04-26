import type { AdminModuleKey } from './admin-feature-catalog';

export type LegacyModuleKey = AdminModuleKey;

export type EvidenceStatus = 'observed' | 'inferred' | 'unverified';

export interface LegacyNavigationItem {
  id: string;
  label: string;
  menuPath: string[];
  moduleLabel: string;
  moduleKey: LegacyModuleKey;
  legacyRoute: string;
  routePath: string;
  status: EvidenceStatus;
  evidence: string[];
  requiredPermissions?: string[];
  requiredGroups?: string[];
  featureFlag?: string;
  requiredRole?: string;
}

export interface LegacyNavigationSection {
  moduleLabel: string;
  moduleKey: LegacyModuleKey;
  routePath: string;
  status: EvidenceStatus;
  items: LegacyNavigationItem[];
}

export interface LegacyModuleRouteEntry {
  id: string;
  moduleLabel: string;
  moduleKey: LegacyModuleKey;
  legacyRoute: string;
  childPath: string;
  routePath: string;
  status: EvidenceStatus;
  access: string;
  evidence: string[];
  requiredPermissions?: string[];
  requiredGroups?: string[];
  featureFlag?: string;
  requiredRole?: string;
}
