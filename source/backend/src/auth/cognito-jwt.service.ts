import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type jwksRsa from 'jwks-rsa';
import { createVerify } from 'node:crypto';

import { PermissionsService } from '../iam/permissions/permissions.service';
import {
  AuthenticatedActor,
  CognitoJwtHeader,
  CognitoJwtPayload,
} from './auth.types';

type JwksClient = ReturnType<typeof jwksRsa>;
type JwksRsaNamespace = { default: typeof jwksRsa };

interface DecodedToken {
  header: CognitoJwtHeader;
  payload: CognitoJwtPayload;
  signingInput: string;
  signature: Buffer;
}

const TENANT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CognitoJwtService {
  private client?: JwksClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async verifyAuthorizationHeader(
    value: string | string[] | undefined,
  ): Promise<AuthenticatedActor> {
    const authorization = Array.isArray(value) ? value[0] : value;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    return this.verifyToken(authorization.slice('Bearer '.length).trim());
  }

  async verifyToken(token: string): Promise<AuthenticatedActor> {
    const decoded = this.decode(token);

    if (
      this.configService.get<boolean>('AUTH_ALLOW_UNSIGNED_TEST_TOKENS') ===
      true
    ) {
      this.validateClaims(decoded.payload);
      return this.toActor(decoded.payload);
    }

    await this.verifySignature(decoded);
    this.validateClaims(decoded.payload);
    return this.toActor(decoded.payload);
  }

  private decode(token: string): DecodedToken {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1]) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    try {
      return {
        header: JSON.parse(
          Buffer.from(parts[0], 'base64url').toString('utf8'),
        ) as CognitoJwtHeader,
        payload: JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8'),
        ) as CognitoJwtPayload,
        signingInput: `${parts[0]}.${parts[1]}`,
        signature: Buffer.from(parts[2], 'base64url'),
      };
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private async verifySignature(decoded: DecodedToken): Promise<void> {
    if (decoded.header.alg !== 'RS256') {
      throw new UnauthorizedException('Unsupported token algorithm');
    }
    if (!decoded.header.kid) {
      throw new UnauthorizedException('Missing token key id');
    }
    if (!this.client) {
      throw new UnauthorizedException('Cognito JWKS is not configured');
    }

    try {
      const client = await this.getClient();
      const key = await client.getSigningKey(decoded.header.kid);
      const verifier = createVerify('RSA-SHA256');
      verifier.update(decoded.signingInput);
      verifier.end();

      const verified = verifier.verify(key.getPublicKey(), decoded.signature);
      if (!verified) {
        throw new UnauthorizedException('Invalid token signature');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid token signature');
    }
  }

  private async getClient(): Promise<JwksClient> {
    if (this.client) return this.client;

    const jwksUri = this.configService.get<string>('COGNITO_JWKS_URI');
    if (!jwksUri) {
      throw new UnauthorizedException('Cognito JWKS is not configured');
    }

    const { default: createJwksClient } =
      (await import('jwks-rsa')) as JwksRsaNamespace;
    this.client = createJwksClient({
      jwksUri,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    return this.client;
  }

  private validateClaims(payload: CognitoJwtPayload): void {
    const now = Math.floor(Date.now() / 1000);
    const issuer = this.configService.get<string>('COGNITO_ISSUER');
    const audience = this.configService.get<string>('COGNITO_CLIENT_ID');
    const tokenUse = this.configService.get<string>('COGNITO_TOKEN_USE');
    const tenantId = this.readTenantId(payload);

    if (!payload.sub) {
      throw new UnauthorizedException('Token subject is missing');
    }
    if (!tenantId) {
      throw new UnauthorizedException('Token tenant is missing');
    }
    if (!TENANT_ID_PATTERN.test(tenantId)) {
      throw new UnauthorizedException('Token tenant is invalid');
    }
    if (payload.exp && payload.exp <= now) {
      throw new UnauthorizedException('Token is expired');
    }
    if (payload.nbf && payload.nbf > now) {
      throw new UnauthorizedException('Token is not active yet');
    }
    if (issuer && payload.iss !== issuer) {
      throw new UnauthorizedException('Token issuer is invalid');
    }
    if (audience && !this.audienceMatches(payload, audience)) {
      throw new UnauthorizedException('Token audience is invalid');
    }
    if (tokenUse && payload.token_use !== tokenUse) {
      throw new UnauthorizedException('Token use is invalid');
    }
  }

  private audienceMatches(
    payload: CognitoJwtPayload,
    expected: string,
  ): boolean {
    if (payload.client_id === expected) return true;
    if (Array.isArray(payload.aud)) return payload.aud.includes(expected);
    return payload.aud === expected;
  }

  private toActor(payload: CognitoJwtPayload): AuthenticatedActor {
    const groups = Array.isArray(payload['cognito:groups'])
      ? payload['cognito:groups']
      : [];
    const tenantId = this.readTenantId(payload);

    if (!tenantId) {
      throw new UnauthorizedException('Token tenant is missing');
    }

    return {
      sub: payload.sub ?? '',
      username:
        payload['cognito:username'] ??
        payload.username ??
        payload.email ??
        payload.sub ??
        '',
      tenantId,
      groups,
      permissions: this.permissionsService.permissionsForGroups(groups),
      claims: this.safeClaims(payload),
    };
  }

  private safeClaims(payload: CognitoJwtPayload): Record<string, unknown> {
    const {
      sub,
      username,
      email,
      iss,
      aud,
      client_id,
      token_use,
      'custom:tenant_id': customTenantId,
      tenant_id,
    } = payload;
    return {
      sub,
      username,
      email,
      iss,
      aud,
      client_id,
      token_use,
      'custom:tenant_id': customTenantId,
      tenant_id,
    };
  }

  private readTenantId(payload: CognitoJwtPayload): string | undefined {
    const customTenantId = payload['custom:tenant_id'];
    if (typeof customTenantId === 'string' && customTenantId.trim()) {
      return customTenantId.trim();
    }

    if (typeof payload.tenant_id === 'string' && payload.tenant_id.trim()) {
      return payload.tenant_id.trim();
    }

    return undefined;
  }
}
