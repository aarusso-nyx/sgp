import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CognitoJwtService } from '../../auth/cognito-jwt.service';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import type { RequestWithContext } from '../../common/request-id/request-with-context';
import {
  IS_PUBLIC_ROUTE,
  REQUIRED_PERMISSIONS,
} from '../decorators/require-permission.decorator';
import type { Permission } from '../permissions/permission-catalog.generated';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cognitoJwtService: CognitoJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      throw new ForbiddenException('Route requires an explicit permission');
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const actor =
      request.actor ??
      (await this.cognitoJwtService.verifyAuthorizationHeader(
        request.headers.authorization,
      ));
    request.actor = actor;
    request.tenantId = actor.tenantId;
    RequestContextStore.setActor(actor);
    RequestContextStore.setTenantId(actor.tenantId);

    const actorPermissions = new Set(actor.permissions);
    const allowed = required.every((permission) =>
      actorPermissions.has(permission),
    );
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
