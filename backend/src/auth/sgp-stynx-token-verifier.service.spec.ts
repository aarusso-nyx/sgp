import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import type { PermissionsService } from '../iam/permissions/permissions.service';
import { SgpStynxTokenVerifier } from './sgp-stynx-token-verifier.service';

const tenantId = '00000000-0000-4000-8000-000000000001';

describe('SgpStynxTokenVerifier', () => {
  it('verifies unsigned test tokens and merges catalog permissions', async () => {
    const permissions = permissionsService(['folha.read', 'admin.read']);
    const verifier = new SgpStynxTokenVerifier(
      configService({ AUTH_ALLOW_UNSIGNED_TEST_TOKENS: true }),
      permissions,
    );

    const result = await verifier.verifyAuthorizationHeader([
      `Bearer ${jwt({
        sub: 'user-1',
        username: 'user.name',
        'cognito:groups': ['SGP_ADMIN', '', 123],
        'custom:tenant_id': ` ${tenantId} `,
        permissions: ['portal.read', null, 'folha.read'],
        email: 'user@example.test',
        exp: Math.floor(Date.now() / 1000) + 60,
        token_use: 'access',
      })}`,
    ]);

    expect(result).toMatchObject({
      tokenUse: 'access',
      principal: {
        id: 'user-1',
        username: 'user.name',
        roles: ['SGP_ADMIN', '', 123],
        tenants: [tenantId],
        email: 'user@example.test',
        permissions: ['admin.read', 'folha.read', 'portal.read'],
      },
    });
    expect(permissions.permissionsForGroups).toHaveBeenCalledWith(
      ['SGP_ADMIN', '', 123],
      tenantId,
    );
  });

  it('accepts alternate unsigned token claims and audience shapes', async () => {
    const verifier = new SgpStynxTokenVerifier(
      configService({
        AUTH_ALLOW_UNSIGNED_TEST_TOKENS: true,
        COGNITO_ISSUER: 'https://issuer.example.test',
        COGNITO_CLIENT_ID: 'client-1',
        COGNITO_TOKEN_USE: 'id',
      }),
      permissionsService([]),
    );

    const result = await verifier.verifyAuthorizationHeader(
      `Bearer ${jwt({
        sub: 'user-2',
        'cognito:username': 'cognito-user',
        tenant_id: tenantId,
        iss: 'https://issuer.example.test',
        aud: ['other-client', 'client-1'],
        token_use: 'id',
      })}`,
    );

    expect(result.principal.username).toBe('cognito-user');
    expect(result.principal.tenants).toEqual([tenantId]);
  });

  it.each([
    ['missing bearer', undefined, 'Missing bearer token'],
    ['invalid jwt parts', 'Bearer not-a-jwt', 'Invalid bearer token'],
    [
      'invalid json payload',
      `Bearer a.${Buffer.from('{', 'utf8').toString('base64url')}.b`,
      'Invalid bearer token',
    ],
    [
      'missing subject',
      `Bearer ${jwt({ tenant_id: tenantId })}`,
      'Token subject is missing',
    ],
    [
      'missing tenant',
      `Bearer ${jwt({ sub: 'user-1' })}`,
      'Token tenant is missing',
    ],
    [
      'invalid tenant',
      `Bearer ${jwt({ sub: 'user-1', tenant_id: 'bad-tenant' })}`,
      'Token tenant is invalid',
    ],
    [
      'expired',
      `Bearer ${jwt({
        sub: 'user-1',
        tenant_id: tenantId,
        exp: Math.floor(Date.now() / 1000) - 1,
      })}`,
      'Token is expired',
    ],
    [
      'not active',
      `Bearer ${jwt({
        sub: 'user-1',
        tenant_id: tenantId,
        nbf: Math.floor(Date.now() / 1000) + 60,
      })}`,
      'Token is not active yet',
    ],
  ])(
    'rejects unsigned test tokens with %s',
    async (_name, authorization, message) => {
      const verifier = new SgpStynxTokenVerifier(
        configService({ AUTH_ALLOW_UNSIGNED_TEST_TOKENS: true }),
        permissionsService([]),
      );

      await expect(
        verifier.verifyAuthorizationHeader(authorization),
      ).rejects.toThrow(message);
    },
  );

  it.each([
    [
      'issuer',
      { COGNITO_ISSUER: 'https://issuer.example.test' },
      { iss: 'https://wrong.example.test' },
      'Token issuer is invalid',
    ],
    [
      'audience',
      { COGNITO_CLIENT_ID: 'client-1' },
      { aud: 'client-2' },
      'Token audience is invalid',
    ],
    [
      'client id audience',
      { COGNITO_CLIENT_ID: 'client-1' },
      { client_id: 'client-2' },
      'Token audience is invalid',
    ],
    [
      'token use',
      { COGNITO_TOKEN_USE: 'access' },
      { token_use: 'id' },
      'Token use is invalid',
    ],
  ])('rejects invalid %s claims', async (_name, config, claims, message) => {
    const verifier = new SgpStynxTokenVerifier(
      configService({ AUTH_ALLOW_UNSIGNED_TEST_TOKENS: true, ...config }),
      permissionsService([]),
    );

    await expect(
      verifier.verifyAuthorizationHeader(
        `Bearer ${jwt({ sub: 'user-1', tenant_id: tenantId, ...claims })}`,
      ),
    ).rejects.toThrow(message);
  });

  it('rejects signed mode when Cognito issuer is not configured', async () => {
    const verifier = new SgpStynxTokenVerifier(
      configService({ AUTH_ALLOW_UNSIGNED_TEST_TOKENS: false }),
      permissionsService([]),
    );

    await expect(
      verifier.verifyAuthorizationHeader(`Bearer ${jwt({ sub: 'user-1' })}`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes signed verifier failures and preserves configured delegate options', async () => {
    const verifier = new SgpStynxTokenVerifier(
      configService({
        AUTH_ALLOW_UNSIGNED_TEST_TOKENS: false,
        COGNITO_ISSUER: 'https://issuer.example.test',
        COGNITO_CLIENT_ID: 'client-1',
        COGNITO_JWKS_URI: 'https://issuer.example.test/jwks.json',
        COGNITO_TOKEN_USE: 'access',
      }),
      permissionsService([]),
    );
    const signedResult = {
      principal: {
        id: 'signed-user',
        username: 'signed-user',
        roles: ['SGP_USER'],
        permissions: ['portal.read'],
        tenants: [tenantId],
        claims: {},
      },
      token: 'delegate-token',
    };

    (verifier as unknown as { delegate: unknown }).delegate = {
      verifyAuthorizationHeader: jest.fn(async (authorization: string) => {
        if (authorization.includes('throw-string')) {
          throw 'bad-token';
        }
        if (authorization.includes('throw-unauthorized')) {
          throw new UnauthorizedException('delegate unauthorized');
        }
        if (authorization.includes('throw-error')) {
          throw new Error('delegate error');
        }
        return signedResult;
      }),
    };

    await expect(
      verifier.verifyAuthorizationHeader('Bearer signed-token'),
    ).resolves.toMatchObject({
      token: 'signed-token',
      principal: {
        id: 'signed-user',
        tenants: [tenantId],
        permissions: ['portal.read'],
      },
    });
    await expect(
      verifier.verifyAuthorizationHeader('Bearer throw-error'),
    ).rejects.toThrow('delegate error');
    await expect(
      verifier.verifyAuthorizationHeader('Bearer throw-string'),
    ).rejects.toThrow('Invalid bearer token');
    await expect(
      verifier.verifyAuthorizationHeader('Bearer throw-unauthorized'),
    ).rejects.toThrow('delegate unauthorized');
  });

  it('covers unsigned helper fallbacks for tenant, audience, roles, and claims', () => {
    const verifier = new SgpStynxTokenVerifier(
      configService({}),
      permissionsService([]),
    ) as unknown as {
      audienceMatches(
        payload: Record<string, unknown>,
        expected: string,
      ): boolean;
      readTenantId(payload: Record<string, unknown>): string | undefined;
      requireTenant(value: string | undefined): string;
      stringArray(value: unknown): string[];
      safeClaims(payload: Record<string, unknown>): Record<string, unknown>;
    };

    expect(
      verifier.audienceMatches({ client_id: 'client-1' }, 'client-1'),
    ).toBe(true);
    expect(verifier.audienceMatches({ aud: 'client-1' }, 'client-1')).toBe(
      true,
    );
    expect(verifier.audienceMatches({ aud: ['other'] }, 'client-1')).toBe(
      false,
    );
    expect(
      verifier.readTenantId({ 'custom:tenant_id': '   ' }),
    ).toBeUndefined();
    expect(verifier.readTenantId({ tenant_id: ` ${tenantId} ` })).toBe(
      tenantId,
    );
    expect(verifier.requireTenant(tenantId)).toBe(tenantId);
    expect(() => verifier.requireTenant('bad')).toThrow(
      'Token tenant is invalid',
    );
    expect(verifier.stringArray('not-array')).toEqual([]);
    expect(verifier.stringArray(['ok', '', 1, 'also-ok'])).toEqual([
      'ok',
      'also-ok',
    ]);
    expect(
      verifier.safeClaims({
        sub: 'user',
        username: 'user-name',
        email: 'user@example.test',
        extra: true,
      }),
    ).toMatchObject({
      sub: 'user',
      username: 'user-name',
      email: 'user@example.test',
      extra: true,
    });
  });
});

function jwt(payload: Record<string, unknown>): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.');
}

function configService(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function permissionsService(permissions: string[]): PermissionsService {
  return {
    permissionsForGroups: jest.fn(async () => permissions),
  } as unknown as PermissionsService;
}
