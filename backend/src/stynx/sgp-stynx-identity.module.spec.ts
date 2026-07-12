import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  AuthContextGuard,
  AuthorizationGuard,
  STYNX_TOKEN_VERIFIER,
} from '@stynx-nyx/backend';

import { SgpStynxTokenVerifier } from '../auth/sgp-stynx-token-verifier.service';
import {
  SgpStynxIdentityModule,
  SgpTenantEntitlementPolicy,
  SgpTenantResolver,
} from './sgp-stynx-identity.module';

describe('SGP STYNX identity composition', () => {
  const principal = {
    id: 'user-1',
    roles: ['RH'],
    permissions: ['rh.read', 'rh.write'],
    tenants: [
      '00000000-0000-4000-8000-000000000100',
      '00000000-0000-4000-8000-000000000200',
    ],
    claims: {},
  };

  it('binds STYNX auth and authorization to the SGP Cognito verifier', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), SgpStynxIdentityModule.forRoot()],
    }).compile();

    expect(moduleRef.get(AuthContextGuard)).toBeDefined();
    expect(moduleRef.get(AuthorizationGuard)).toBeDefined();
    expect(moduleRef.get(STYNX_TOKEN_VERIFIER)).toBeDefined();
    expect(moduleRef.get(SgpStynxTokenVerifier)).toBeDefined();
    await moduleRef.close();
  });

  it('preserves general UUID tenants and enforces multi-tenant entitlement', () => {
    const resolver = new SgpTenantResolver();
    const policy = new SgpTenantEntitlementPolicy();

    expect(resolver.resolve({ principal })).toBe(principal.tenants[0]);
    expect(
      resolver.resolve({
        principal,
        headerTenantId: principal.tenants[1],
      }),
    ).toBe(principal.tenants[1]);
    expect(
      policy.isEntitled({ principal, tenantId: principal.tenants[1] }),
    ).toBe(true);
    expect(
      policy.isEntitled({
        principal,
        tenantId: '00000000-0000-4000-8000-000000000999',
      }),
    ).toBe(false);
  });
});
