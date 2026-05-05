import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard, STYNX_AUTHZ_METADATA } from '@stynx/backend';

import { SgpStynxAuthorizationGuard } from '../../../backend/src/auth/sgp-stynx-auth.guard';
import { REQUIRED_PERMISSIONS } from '../../../backend/src/iam/decorators/require-permission.decorator';

export const FROZEN_TEST_TIME = new Date('2026-05-02T12:00:00.000Z');

function executionContext() {
  return {
    getHandler: () => Symbol('handler'),
    getClass: () => Symbol('class'),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: 'Bearer wave-7-negative-path' },
        principal: {
          id: 'wave-7-reader',
          roles: ['RH_READONLY'],
          permissions: ['rh.read'],
          tenants: ['00000000-0000-0000-0000-000000000100'],
          claims: {},
        },
      }),
    }),
  } as never;
}

export async function expectForbiddenNegativePath(): Promise<void> {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === REQUIRED_PERMISSIONS) return ['rh.write'];
    if (key === STYNX_AUTHZ_METADATA) {
      return { permissions: { permissions: ['rh.write'] } };
    }
    return undefined;
  });

  const guard = new SgpStynxAuthorizationGuard(
    reflector,
    new AuthorizationGuard(reflector),
  );

  try {
    await guard.canActivate(executionContext());
    throw new Error('Expected SgpStynxAuthorizationGuard to return 403');
  } catch (error) {
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getStatus()).toBe(403);
  }
}
