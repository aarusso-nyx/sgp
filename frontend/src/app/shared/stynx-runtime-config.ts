import {
  EnvironmentProviders,
  Injectable,
  importProvidersFrom,
  makeEnvironmentProviders,
} from '@angular/core';
import { AuthOptions, LoginResponse, OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';
import {
  STYNX_AUTH_BACKEND,
  STYNX_OIDC_ADAPTER,
  StynxAngularAuthModule,
  type StynxAuthBackend,
  type StynxOidcAdapter,
  type StynxSessionBundle,
} from '@stynx-nyx/angular-auth';
import { provideTenancy } from '@stynx-nyx/angular-tenancy';

type RuntimeConfig = Record<string, string | undefined>;

export function provideSgpStynxWeb(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideTenancy({
      defaultTenantResolver: () =>
        runtimeConfig()['TENANT_ID'] ?? runtimeConfig()['DEFAULT_TENANT_ID'] ?? null,
    }),
    importProvidersFrom(
      StynxAngularAuthModule.forRoot({
        oidc: {
          authority: runtimeConfig()['COGNITO_DOMAIN'] ?? '',
          clientId: runtimeConfig()['COGNITO_CLIENT_ID'] ?? '',
          redirectUrl: redirectUri(),
          postLogoutRedirectUri: window.location.origin,
          responseType: 'code',
          scope: scopes().join(' '),
          silentRenew: true,
          useRefreshToken: true,
        },
        loginRedirectRoute: '/',
        unauthorizedRoute: '/forbidden',
        sessionStorageKey: 'sgp.stynx.session',
        refreshTokenStorage: 'session-storage',
      }),
    ),
    {
      provide: STYNX_AUTH_BACKEND,
      useClass: SgpStynxBearerAuthBackend,
    },
    {
      provide: STYNX_OIDC_ADAPTER,
      useClass: SgpStynxOidcAdapter,
    },
  ]);
}

@Injectable()
class SgpStynxOidcAdapter implements StynxOidcAdapter {
  constructor(private readonly oidcSecurity: OidcSecurityService) {}

  checkAuth(url?: string): Promise<LoginResponse> {
    const token = e2eAccessToken();
    if (token) return Promise.resolve(loginResponse(token));
    return firstValueFrom(this.oidcSecurity.checkAuth(url));
  }

  authorize(authOptions?: AuthOptions): void {
    if (e2eMode()) {
      window.location.href = authorizationUrl(authOptions);
      return;
    }

    this.oidcSecurity.authorize(undefined, authOptions);
  }

  async logoff(): Promise<void> {
    if (e2eMode()) return;
    await firstValueFrom(this.oidcSecurity.logoff());
  }

  forceRefreshSession(): Promise<LoginResponse> {
    const token = e2eAccessToken();
    if (token) return Promise.resolve(loginResponse(token));
    if (e2eMode()) return Promise.resolve(loginResponse(null));
    return firstValueFrom(this.oidcSecurity.forceRefreshSession());
  }
}

@Injectable()
class SgpStynxBearerAuthBackend implements StynxAuthBackend {
  exchangeCognitoToken(cognitoToken: string, tenantId: string): Promise<StynxSessionBundle> {
    return Promise.resolve(this.bundleFromBearerToken(cognitoToken, tenantId));
  }

  switchTenant(accessToken: string, tenantId: string): Promise<StynxSessionBundle> {
    return Promise.resolve(this.bundleFromBearerToken(accessToken, tenantId));
  }

  logout(): Promise<void> {
    return Promise.resolve();
  }

  private bundleFromBearerToken(token: string, tenantId: string): StynxSessionBundle {
    const claims = parseJwtClaims(token);
    const expiresAt = dateFromEpochSeconds(
      typeof claims['exp'] === 'number' ? claims['exp'] : undefined,
    );

    return {
      sid: stringClaim(claims, 'sid') ?? stringClaim(claims, 'sub') ?? 'sgp',
      accessToken: token,
      accessTokenExpiresAt: expiresAt,
      refreshToken: '',
      expiresAt,
      idleExpiresAt: expiresAt,
      permissions: stringArrayClaim(claims, 'permissions'),
    };
  }
}

function redirectUri(): string {
  return runtimeConfig()['COGNITO_REDIRECT_URI'] ?? `${window.location.origin}/auth/callback`;
}

function scopes(): string[] {
  return (runtimeConfig()['COGNITO_SCOPE'] ?? 'openid email profile')
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function runtimeConfig(): RuntimeConfig {
  return (window as unknown as { SGP_CONFIG?: RuntimeConfig }).SGP_CONFIG ?? {};
}

function e2eMode(): boolean {
  return runtimeConfig()['STYNX_E2E'] === 'true';
}

function e2eAccessToken(): string | null {
  if (!e2eMode()) return null;
  return runtimeConfig()['STYNX_E2E_ACCESS_TOKEN'] ?? null;
}

function loginResponse(accessToken: string | null): LoginResponse {
  return {
    isAuthenticated: Boolean(accessToken),
    accessToken: accessToken ?? '',
    idToken: accessToken ?? '',
    userData: {},
    configId: 'sgp-stynx',
  } as LoginResponse;
}

function authorizationUrl(authOptions?: AuthOptions): string {
  const config = runtimeConfig();
  const url = new URL(`${(config['COGNITO_DOMAIN'] ?? '').replace(/\/$/, '')}/oauth2/authorize`);
  url.searchParams.set('client_id', config['COGNITO_CLIENT_ID'] ?? '');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('scope', scopes().join(' '));
  if (authOptions?.customParams) {
    Object.entries(authOptions.customParams).forEach(([key, value]) => {
      if (typeof value === 'string') url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

function parseJwtClaims(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) return {};

  try {
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function dateFromEpochSeconds(epochSeconds: number | undefined): string {
  const fallback = Date.now() + 10 * 60 * 1000;
  return new Date(epochSeconds ? epochSeconds * 1000 : fallback).toISOString();
}

function stringClaim(claims: Record<string, unknown>, key: string): string | null {
  const value = claims[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function stringArrayClaim(claims: Record<string, unknown>, key: string): string[] {
  const value = claims[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}
