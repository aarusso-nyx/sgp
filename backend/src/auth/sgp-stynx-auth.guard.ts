import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthContextGuard, AuthorizationGuard } from '@stynx-nyx/backend';
import type { AuthVerificationResult, Principal } from '@stynx-nyx/contracts';

import { RequestContextStore } from '../common/request-context/request-context.store';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { tenantId as brandTenantId } from '../common/types/branded-ids';
import {
  IS_PUBLIC_ROUTE,
  REQUIRED_PERMISSIONS,
} from '../iam/decorators/require-permission.decorator';
import type { AuthenticatedActor } from './actor.types';

@Injectable()
export class SgpStynxAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authContextGuard: AuthContextGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) return true;

    const allowed = await this.authContextGuard.canActivate(context);
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const principal = request.principal;
    if (!principal) {
      throw new UnauthorizedException(
        'Token verification returned no principal',
      );
    }

    const resolvedTenantId = request.tenantId ?? principal.tenants[0];
    if (!resolvedTenantId) {
      throw new UnauthorizedException('Token tenant is missing');
    }

    const actor = this.toActor(principal, resolvedTenantId);
    request.tenantId = brandTenantId(resolvedTenantId);
    request.actor = actor;
    RequestContextStore.setActor(actor);
    RequestContextStore.setTenantId(resolvedTenantId);

    return allowed;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private toActor(principal: Principal, tenantId: string): AuthenticatedActor {
    return {
      sub: principal.id,
      username: principal.username ?? principal.email ?? principal.id,
      tenantId,
      groups: principal.roles,
      permissions: principal.permissions,
      claims: principal.claims,
    };
  }
}

@Injectable()
export class SgpStynxAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationGuard: AuthorizationGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      throw new ForbiddenException('Route requires an explicit permission');
    }

    return this.authorizationGuard.canActivate(context);
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}

export function normalizeTokenVerifierResult(
  value: AuthVerificationResult | AuthenticatedActor,
): AuthVerificationResult {
  if ('principal' in value) return value;

  return {
    principal: {
      id: value.sub,
      username: value.username,
      roles: value.groups,
      permissions: value.permissions,
      tenants: [value.tenantId],
      claims: value.claims ?? {},
    },
    token: 'test',
  };
}
