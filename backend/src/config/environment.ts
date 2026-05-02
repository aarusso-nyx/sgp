export interface ValidatedEnvironment {
  NODE_ENV: string;
  PORT: number;
  CORS_ORIGIN?: string;
  AUTH_ALLOW_UNSIGNED_TEST_TOKENS: boolean;
  DATABASE_URL?: string;
  COGNITO_REGION?: string;
  COGNITO_USER_POOL_ID?: string;
  COGNITO_CLIENT_ID?: string;
  COGNITO_ISSUER?: string;
  COGNITO_JWKS_URI?: string;
  COGNITO_TOKEN_USE?: 'access' | 'id';
  AWS_REGION?: string;
  S3_REGION?: string;
  S3_ENDPOINT?: string;
  S3_FORCE_PATH_STYLE: boolean;
  S3_DOCUMENTS_BUCKET?: string;
  S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS: number;
  S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS: number;
  S3_DOCUMENTS_KEY_PREFIX: string;
  MINIO_TEST_STORAGE_ENABLED: boolean;
  MINIO_ENDPOINT?: string;
  MINIO_REGION?: string;
  MINIO_DOCUMENTS_BUCKET?: string;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
}

function optionalUrl(
  name: string,
  value: string | undefined,
  errors: string[],
): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    errors.push(`${name} must be a valid URL`);
    return undefined;
  }
}

function optionalInt(
  name: string,
  value: string | undefined,
  fallback: number,
  errors: string[],
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    errors.push(`${name} must be a positive integer`);
    return fallback;
  }
  return parsed;
}

function optionalBoolean(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.toLowerCase() ?? '');
}

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function buildCognitoIssuer(
  region?: string,
  userPoolId?: string,
): string | undefined {
  if (!region || !userPoolId) return undefined;
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

export function buildCognitoJwksUri(issuer?: string): string | undefined {
  return issuer ? `${issuer}/.well-known/jwks.json` : undefined;
}

export function validateEnvironment(
  config: Record<string, string | undefined>,
): ValidatedEnvironment {
  const errors: string[] = [];
  const issuer = optionalUrl(
    'COGNITO_ISSUER',
    config.COGNITO_ISSUER ??
      buildCognitoIssuer(config.COGNITO_REGION, config.COGNITO_USER_POOL_ID),
    errors,
  );
  const jwksUri = optionalUrl(
    'COGNITO_JWKS_URI',
    config.COGNITO_JWKS_URI ?? buildCognitoJwksUri(issuer),
    errors,
  );
  const tokenUse = config.COGNITO_TOKEN_USE;

  if (tokenUse && tokenUse !== 'access' && tokenUse !== 'id') {
    errors.push('COGNITO_TOKEN_USE must be either access or id when set');
  }

  if (config.COGNITO_REGION && !config.COGNITO_USER_POOL_ID) {
    errors.push('COGNITO_USER_POOL_ID is required when COGNITO_REGION is set');
  }
  if (config.COGNITO_USER_POOL_ID && !config.COGNITO_REGION) {
    errors.push('COGNITO_REGION is required when COGNITO_USER_POOL_ID is set');
  }

  const port = optionalInt('PORT', config.PORT, 3000, errors);
  const presignExpires = optionalInt(
    'S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS',
    config.S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS,
    900,
    errors,
  );
  const downloadExpires = optionalInt(
    'S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS',
    config.S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS,
    300,
    errors,
  );

  const s3Region =
    optionalString(config.S3_REGION) ?? optionalString(config.AWS_REGION);
  const s3Endpoint = optionalUrl('S3_ENDPOINT', config.S3_ENDPOINT, errors);
  const s3Bucket = optionalString(config.S3_DOCUMENTS_BUCKET);
  const s3KeyPrefix =
    optionalString(config.S3_DOCUMENTS_KEY_PREFIX) ?? 'documents';
  const minioEndpoint = optionalUrl(
    'MINIO_ENDPOINT',
    config.MINIO_ENDPOINT,
    errors,
  );

  if (errors.length > 0) {
    throw new Error(`Invalid backend configuration: ${errors.join('; ')}`);
  }

  return {
    NODE_ENV: config.NODE_ENV ?? 'development',
    PORT: port,
    CORS_ORIGIN: config.CORS_ORIGIN,
    AUTH_ALLOW_UNSIGNED_TEST_TOKENS: optionalBoolean(
      config.AUTH_ALLOW_UNSIGNED_TEST_TOKENS,
    ),
    DATABASE_URL: config.DATABASE_URL,
    COGNITO_REGION: config.COGNITO_REGION,
    COGNITO_USER_POOL_ID: config.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: config.COGNITO_CLIENT_ID,
    COGNITO_ISSUER: issuer,
    COGNITO_JWKS_URI: jwksUri,
    COGNITO_TOKEN_USE: tokenUse as 'access' | 'id' | undefined,
    AWS_REGION: optionalString(config.AWS_REGION),
    S3_REGION: s3Region,
    S3_ENDPOINT: s3Endpoint,
    S3_FORCE_PATH_STYLE: optionalBoolean(config.S3_FORCE_PATH_STYLE),
    S3_DOCUMENTS_BUCKET: s3Bucket,
    S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS: presignExpires,
    S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS: downloadExpires,
    S3_DOCUMENTS_KEY_PREFIX: s3KeyPrefix,
    MINIO_TEST_STORAGE_ENABLED: optionalBoolean(
      config.MINIO_TEST_STORAGE_ENABLED,
    ),
    MINIO_ENDPOINT: minioEndpoint,
    MINIO_REGION: optionalString(config.MINIO_REGION),
    MINIO_DOCUMENTS_BUCKET: optionalString(config.MINIO_DOCUMENTS_BUCKET),
    MINIO_ACCESS_KEY: optionalString(config.MINIO_ACCESS_KEY),
    MINIO_SECRET_KEY: optionalString(config.MINIO_SECRET_KEY),
  };
}
