import { UnauthorizedException } from '@nestjs/common';

import { CognitoJwtService } from './cognito-jwt.service';

describe('CognitoJwtService', () => {
  function createService(
    config: Record<string, unknown> = {
      AUTH_ALLOW_UNSIGNED_TEST_TOKENS: true,
    },
  ) {
    return new CognitoJwtService(
      {
        get(key: string) {
          return config[key];
        },
      } as never,
      {
        permissionsForGroups: jest
          .fn()
          .mockImplementation((groups: string[]) =>
            groups.map(() => 'auth:read'),
          ),
      } as never,
    );
  }

  it('accepts the Cognito custom tenant claim', async () => {
    const service = createService();

    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-1',
          'cognito:username': 'tenant.user',
          'cognito:groups': ['SGP_ADMIN'],
          'custom:tenant_id': '00000000-0000-0000-0000-000000000100',
          token_use: 'access',
          exp: Math.floor(Date.now() / 1000) + 300,
        }),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        username: 'tenant.user',
        tenantId: '00000000-0000-0000-0000-000000000100',
      }),
    );
  });

  it('falls back to tenant_id when the custom claim is absent', async () => {
    const service = createService();

    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-2',
          tenant_id: '00000000-0000-0000-0000-000000000101',
          token_use: 'access',
          exp: Math.floor(Date.now() / 1000) + 300,
        }),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        tenantId: '00000000-0000-0000-0000-000000000101',
      }),
    );
  });

  it('rejects tokens without a tenant claim', async () => {
    const service = createService();

    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-3',
          token_use: 'access',
          exp: Math.floor(Date.now() / 1000) + 300,
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts bearer headers and audience variants for unsigned test tokens', async () => {
    const service = createService({
      AUTH_ALLOW_UNSIGNED_TEST_TOKENS: true,
      COGNITO_ISSUER: 'https://issuer.example',
      COGNITO_CLIENT_ID: 'client-1',
      COGNITO_TOKEN_USE: 'access',
    });
    const token = unsignedToken({
      sub: 'user-4',
      username: 'plain.username',
      'cognito:groups': ['SGP_ADMIN', 'RH'],
      tenant_id: '00000000-0000-0000-0000-000000000102',
      iss: 'https://issuer.example',
      aud: ['other-client', 'client-1'],
      token_use: 'access',
      exp: Math.floor(Date.now() / 1000) + 300,
      nbf: Math.floor(Date.now() / 1000) - 1,
    });

    await expect(
      service.verifyAuthorizationHeader(['Bearer ' + token]),
    ).resolves.toMatchObject({
      sub: 'user-4',
      username: 'plain.username',
      groups: ['SGP_ADMIN', 'RH'],
      permissions: ['auth:read', 'auth:read'],
      claims: {
        username: 'plain.username',
        aud: ['other-client', 'client-1'],
      },
    });
  });

  it('falls back through username, email, subject, and empty groups', async () => {
    const service = createService();

    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-5',
          email: 'user5@example.test',
          tenant_id: '00000000-0000-0000-0000-000000000103',
        }),
      ),
    ).resolves.toMatchObject({
      username: 'user5@example.test',
      groups: [],
    });
    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-6',
          tenant_id: '00000000-0000-0000-0000-000000000104',
          client_id: 'client-1',
        }),
      ),
    ).resolves.toMatchObject({
      username: 'user-6',
      claims: { client_id: 'client-1' },
    });
  });

  it('rejects malformed bearer tokens and invalid claims', async () => {
    const service = createService({
      AUTH_ALLOW_UNSIGNED_TEST_TOKENS: true,
      COGNITO_ISSUER: 'issuer',
      COGNITO_CLIENT_ID: 'client-1',
      COGNITO_TOKEN_USE: 'access',
    });
    const expired = Math.floor(Date.now() / 1000) - 1;
    const future = Math.floor(Date.now() / 1000) + 300;

    await expect(service.verifyAuthorizationHeader(undefined)).rejects.toThrow(
      'Missing bearer token',
    );
    await expect(
      service.verifyAuthorizationHeader('Basic token'),
    ).rejects.toThrow('Missing bearer token');
    await expect(service.verifyToken('bad-token')).rejects.toThrow(
      'Invalid bearer token',
    );
    await expect(service.verifyToken('bad.payload.')).rejects.toThrow(
      'Invalid bearer token',
    );
    await expect(
      service.verifyToken(
        unsignedToken({
          tenant_id: '00000000-0000-0000-0000-000000000105',
        }),
      ),
    ).rejects.toThrow('Token subject is missing');
    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-7',
          tenant_id: 'not-a-uuid',
        }),
      ),
    ).rejects.toThrow('Token tenant is invalid');
    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-8',
          tenant_id: '00000000-0000-0000-0000-000000000106',
          exp: expired,
        }),
      ),
    ).rejects.toThrow('Token is expired');
    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-9',
          tenant_id: '00000000-0000-0000-0000-000000000107',
          nbf: future,
        }),
      ),
    ).rejects.toThrow('Token is not active yet');
    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-10',
          tenant_id: '00000000-0000-0000-0000-000000000108',
          iss: 'wrong',
        }),
      ),
    ).rejects.toThrow('Token issuer is invalid');
    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-11',
          tenant_id: '00000000-0000-0000-0000-000000000109',
          iss: 'issuer',
          aud: 'wrong',
        }),
      ),
    ).rejects.toThrow('Token audience is invalid');
    await expect(
      service.verifyToken(
        unsignedToken({
          sub: 'user-12',
          tenant_id: '00000000-0000-0000-0000-000000000110',
          iss: 'issuer',
          aud: 'client-1',
          token_use: 'id',
        }),
      ),
    ).rejects.toThrow('Token use is invalid');
  });

  it('requires RS256, kid, and configured JWKS for signed token verification', async () => {
    const unsupported = createService({
      AUTH_ALLOW_UNSIGNED_TEST_TOKENS: false,
    });
    await expect(
      unsupported.verifyToken(
        signedShapeToken({ alg: 'HS256', kid: 'key-1' }, validPayload()),
      ),
    ).rejects.toThrow('Unsupported token algorithm');

    const missingKid = createService({
      AUTH_ALLOW_UNSIGNED_TEST_TOKENS: false,
    });
    await expect(
      missingKid.verifyToken(
        signedShapeToken({ alg: 'RS256' }, validPayload()),
      ),
    ).rejects.toThrow('Missing token key id');

    const missingJwks = createService({
      AUTH_ALLOW_UNSIGNED_TEST_TOKENS: false,
    });
    await expect(
      missingJwks.verifyToken(
        signedShapeToken({ alg: 'RS256', kid: 'key-1' }, validPayload()),
      ),
    ).rejects.toThrow('Cognito JWKS is not configured');
  });
});

function unsignedToken(payload: Record<string, unknown>): string {
  return `${encodePart({ alg: 'none', typ: 'JWT' })}.${encodePart(payload)}.`;
}

function signedShapeToken(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
): string {
  return `${encodePart(header)}.${encodePart(payload)}.${Buffer.from('signature').toString('base64url')}`;
}

function validPayload(): Record<string, unknown> {
  return {
    sub: 'user-signed',
    tenant_id: '00000000-0000-0000-0000-000000000111',
  };
}

function encodePart(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
