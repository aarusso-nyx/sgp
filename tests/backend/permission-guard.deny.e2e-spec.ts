import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard, STYNX_AUTHZ_METADATA } from '@stynx-nyx/backend';

import {
  SgpStynxAuthGuard,
  SgpStynxAuthorizationGuard,
} from '../../backend/src/auth/sgp-stynx-auth.guard';
import { REQUIRED_PERMISSIONS } from '../../backend/src/iam/decorators/require-permission.decorator';

function executionContext(authorization?: string, requestOverrides = {}) {
  return {
    getHandler: () => Symbol('handler'),
    getClass: () => Symbol('class'),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization ? { authorization } : {},
        ...requestOverrides,
      }),
    }),
  } as never;
}

describe('SGP Stynx auth deny behavior', () => {
  it('returns 403 when a route has no @RequirePermission or @Public metadata', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as never as Reflector;
    const guard = new SgpStynxAuthorizationGuard(
      reflector,
      new AuthorizationGuard(reflector),
    );

    await expect(
      guard.canActivate(executionContext('Bearer token')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 401 when a protected route receives no token', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRED_PERMISSIONS) return ['gestao.read'];
      return undefined;
    });
    const guard = new SgpStynxAuthGuard(reflector, {
      canActivate: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Missing bearer token')),
    } as never);

    await expect(guard.canActivate(executionContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns 403 when the token has the wrong permission', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRED_PERMISSIONS) return ['gestao.write'];
      if (key === STYNX_AUTHZ_METADATA) {
        return { permissions: { permissions: ['gestao.write'] } };
      }
      return undefined;
    });
    const guard = new SgpStynxAuthorizationGuard(
      reflector,
      new AuthorizationGuard(reflector),
    );

    await expect(
      guard.canActivate(
        executionContext('Bearer token', {
          principal: {
            id: 'user-1',
            roles: ['RH'],
            permissions: ['gestao.read'],
            tenants: ['00000000-0000-0000-0000-000000000100'],
            claims: {},
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
