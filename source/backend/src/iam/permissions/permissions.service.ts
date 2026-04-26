import { Injectable } from '@nestjs/common';

import {
  GROUP_PERMISSION_MAP,
  PERMISSIONS,
  Permission,
} from './permission-catalog';

@Injectable()
export class PermissionsService {
  listPermissions(): Permission[] {
    return [...PERMISSIONS];
  }

  listGroupMappings(): Array<{ group: string; permissions: Permission[] }> {
    return Object.entries(GROUP_PERMISSION_MAP).map(([group, permissions]) => ({
      group,
      permissions: [...permissions],
    }));
  }

  permissionsForGroups(groups: string[]): Permission[] {
    const permissionSet = new Set<Permission>();

    for (const group of groups) {
      const normalized = this.normalizeGroup(group);
      for (const permission of GROUP_PERMISSION_MAP[normalized] ?? []) {
        permissionSet.add(permission);
      }
    }

    if (permissionSet.size > 0) {
      permissionSet.add('auth:read');
    }

    return [...permissionSet].sort();
  }

  private normalizeGroup(group: string): string {
    return group
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }
}
