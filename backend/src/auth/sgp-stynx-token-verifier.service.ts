import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoTokenVerifier } from '@stynx/auth';
import type {
  AuthVerificationResult,
  Principal,
  TokenVerifier,
} from '@stynx/contracts';

import { PermissionsService } from '../iam/permissions/permissions.service';

interface JwtPayload extends Record<string, unknown> {
  sub?: string | undefined;
  username?: string | undefined;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  'custom:tenant_id'?: string;
  tenant_id?: string | undefined;
  email?: string | undefined;
  iss?: string | undefined;
  aud?: string | string[] | undefined;
  client_id?: string | undefined;
  exp?: number | undefined;
  nbf?: number | undefined;
  token_use?: string | undefined;
}

const TENANT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SgpStynxTokenVerifier implements TokenVerifier {
  private delegate?: CognitoTokenVerifier | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async verifyAuthorizationHeader(
    value: string | string[] | undefined,
  ): Promise<AuthVerificationResult> {
    const authorization = Array.isArray(value) ? value[0] : value;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    const result =
      this.configService.get<boolean>('AUTH_ALLOW_UNSIGNED_TEST_TOKENS') ===
      true
        ? this.verifyUnsignedToken(token)
        : await this.verifySignedToken(authorization);

    return this.withSgpPermissions(result, token);
  }

  private async verifySignedToken(
    authorization: string,
  ): Promise<AuthVerificationResult> {
    try {
      const result =
        await this.getDelegate().verifyAuthorizationHeader(authorization);
      this.requireTenant(result.principal.tenants[0]);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const message =
        error instanceof Error ? error.message : 'Invalid bearer token';
      throw new UnauthorizedException(message);
    }
  }

  private verifyUnsignedToken(token: string): AuthVerificationResult {
    const payload = this.decodePayload(token);
    this.validateClaims(payload);
    const tenantId = this.readTenantId(payload);
    if (!tenantId) {
      throw new UnauthorizedException('Token tenant is missing');
    }

    const roles = Array.isArray(payload['cognito:groups'])
      ? payload['cognito:groups']
      : [];
    const username =
      payload['cognito:username'] ??
      payload.username ??
      payload.email ??
      payload.sub ??
      '';

    const principal: Principal = {
      id: payload.sub ?? '',
      username,
      roles,
      permissions: this.stringArray(payload.permissions),
      tenants: [tenantId],
      claims: this.safeClaims(payload),
      ...(payload.email ? { email: payload.email } : {}),
    };

    return {
      principal: {
        ...principal,
      },
      token,
      ...(payload.exp !== undefined ? { expiresAt: payload.exp } : {}),
      ...(payload.token_use !== undefined
        ? { tokenUse: payload.token_use }
        : {}),
    };
  }

  private async withSgpPermissions(
    result: AuthVerificationResult,
    token: string,
  ): Promise<AuthVerificationResult> {
    const tenantId = this.requireTenant(result.principal.tenants[0]);
    const groupPermissions = await this.permissionsService.permissionsForGroups(
      result.principal.roles,
      tenantId,
    );
    const principal: Principal = {
      ...result.principal,
      tenants: [tenantId],
      permissions: [
        ...new Set([...result.principal.permissions, ...groupPermissions]),
      ].sort(),
    };

    return {
      ...result,
      token,
      principal,
    };
  }

  private decodePayload(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    try {
      return JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private validateClaims(payload: JwtPayload): void {
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

  private getDelegate(): CognitoTokenVerifier {
    if (this.delegate) return this.delegate;

    const issuer = this.configService.get<string>('COGNITO_ISSUER');
    if (!issuer) {
      throw new UnauthorizedException('Cognito issuer is not configured');
    }

    const tokenUse = this.configService.get<string>('COGNITO_TOKEN_USE');
    const audience = this.configService.get<string>('COGNITO_CLIENT_ID');
    const jwksUri = this.configService.get<string>('COGNITO_JWKS_URI');
    this.delegate = new CognitoTokenVerifier({
      issuer,
      tenantClaims: ['custom:tenant_id', 'tenant_id', 'tenants'],
      roleClaims: ['cognito:groups', 'roles'],
      permissionClaims: ['permissions'],
      ...(audience ? { audience } : {}),
      ...(jwksUri ? { jwksUri } : {}),
      ...(tokenUse === 'id' || tokenUse === 'access'
        ? { enforceTokenUse: tokenUse }
        : {}),
    });

    return this.delegate;
  }

  private audienceMatches(payload: JwtPayload, expected: string): boolean {
    if (payload.client_id === expected) return true;
    if (Array.isArray(payload.aud)) return payload.aud.includes(expected);
    return payload.aud === expected;
  }

  private safeClaims(payload: JwtPayload): Record<string, unknown> {
    return {
      ...payload,
      email: payload.email,
      sub: payload.sub,
      username: payload.username,
      'cognito:username': payload['cognito:username'],
      'custom:tenant_id': payload['custom:tenant_id'],
      tenant_id: payload.tenant_id,
    };
  }

  private readTenantId(payload: JwtPayload): string | undefined {
    const customTenantId = payload['custom:tenant_id'];
    if (typeof customTenantId === 'string' && customTenantId.trim()) {
      return customTenantId.trim();
    }

    if (typeof payload.tenant_id === 'string' && payload.tenant_id.trim()) {
      return payload.tenant_id.trim();
    }

    return undefined;
  }

  private requireTenant(value: string | undefined): string {
    if (!value) {
      throw new UnauthorizedException('Token tenant is missing');
    }
    if (!TENANT_ID_PATTERN.test(value)) {
      throw new UnauthorizedException('Token tenant is invalid');
    }
    return value;
  }

  private stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0,
    );
  }
}
