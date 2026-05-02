import { Injectable } from '@angular/core';

import { NavigationFilter } from '../navigation/navigation-filter';
import { AccessRequirements } from '../navigation/navigation-filter';
import { CognitoAuth } from './cognito-auth';

@Injectable({
  providedIn: 'root',
})
export class Permission {
  constructor(
    private readonly auth: CognitoAuth,
    private readonly navigationFilter: NavigationFilter,
  ) {}

  hasAll(requiredPermissions: string[]): boolean {
    return this.navigationFilter.canAccess(
      {
        requiredPermissions,
      },
      this.auth.currentSession(),
    );
  }

  allows(requirements: AccessRequirements): boolean {
    return this.navigationFilter.canAccess(requirements, this.auth.currentSession());
  }
}
