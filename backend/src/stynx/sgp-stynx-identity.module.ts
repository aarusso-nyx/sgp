import {
  type DynamicModule,
  Module,
  type Provider,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  STYNX_TOKEN_VERIFIER,
  StynxAuthModule,
  StynxAuthorizationModule,
} from '@stynx-nyx/backend';
import type {
  Principal,
  TenantEntitlementPolicy,
  TenantResolver,
} from '@stynx-nyx/contracts';

import { normalizeTokenVerifierResult } from '../auth/sgp-stynx-auth.guard';
import { SgpStynxTokenVerifier } from '../auth/sgp-stynx-token-verifier.service';
import { IamModule } from '../iam/iam.module';

const PLACEHOLDER_TOKEN_VERIFIER = {
  verifyAuthorizationHeader: () =>
    Promise.reject(new UnauthorizedException('SGP verifier was not bound')),
};

export class SgpTenantResolver implements TenantResolver {
  resolve(context: {
    headerTenantId?: string;
    principal: Principal;
  }): string | undefined {
    return context.headerTenantId ?? context.principal.tenants[0];
  }
}

export class SgpTenantEntitlementPolicy implements TenantEntitlementPolicy {
  isEntitled(context: { principal: Principal; tenantId: string }): boolean {
    return context.principal.tenants.includes(context.tenantId);
  }
}

@Module({})
export class SgpStynxIdentityModule {
  static forRoot(): DynamicModule {
    const authModule = rebindSgpTokenVerifier(
      StynxAuthModule.forRoot({
        tokenVerifier: PLACEHOLDER_TOKEN_VERIFIER,
        tenantResolver: new SgpTenantResolver(),
        tenantEntitlementPolicy: new SgpTenantEntitlementPolicy(),
      }),
    );
    const authorizationModule = StynxAuthorizationModule.forRoot();

    return {
      module: SgpStynxIdentityModule,
      imports: [authModule, authorizationModule],
      exports: [authModule, authorizationModule],
    };
  }
}

function rebindSgpTokenVerifier(module: DynamicModule): DynamicModule {
  return {
    ...module,
    imports: [...(module.imports ?? []), ConfigModule, IamModule],
    providers: [
      SgpStynxTokenVerifier,
      ...(module.providers ?? []).map(rebindTokenVerifierProvider),
    ],
    exports: [SgpStynxTokenVerifier, ...(module.exports ?? [])],
  };
}

function rebindTokenVerifierProvider(provider: Provider): Provider {
  if (
    provider &&
    typeof provider === 'object' &&
    'provide' in provider &&
    provider.provide === STYNX_TOKEN_VERIFIER
  ) {
    return {
      provide: STYNX_TOKEN_VERIFIER,
      useFactory: (verifier: SgpStynxTokenVerifier) => ({
        verifyAuthorizationHeader: async (
          value: string | string[] | undefined,
        ) =>
          normalizeTokenVerifierResult(
            await verifier.verifyAuthorizationHeader(value),
          ),
      }),
      inject: [SgpStynxTokenVerifier],
    };
  }
  return provider;
}
