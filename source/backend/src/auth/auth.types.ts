export interface AuthenticatedActor {
  sub: string;
  username: string;
  tenantId: string;
  groups: string[];
  permissions: string[];
  claims?: Record<string, unknown>;
}

export interface CognitoJwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

export interface CognitoJwtPayload extends Record<string, unknown> {
  sub?: string;
  username?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  'custom:tenant_id'?: string;
  tenant_id?: string;
  email?: string;
  iss?: string;
  aud?: string | string[];
  client_id?: string;
  exp?: number;
  nbf?: number;
  token_use?: string;
}
