import {
  buildCognitoIssuer,
  buildCognitoJwksUri,
  validateEnvironment,
} from './environment';

describe('environment validator', () => {
  it('applies safe defaults for local development', () => {
    expect(validateEnvironment({})).toEqual(
      expect.objectContaining({
        NODE_ENV: 'development',
        PORT: 3000,
        AUTH_ALLOW_UNSIGNED_TEST_TOKENS: false,
        S3_FORCE_PATH_STYLE: false,
        S3_DOCUMENTS_PRESIGN_EXPIRES_SECONDS: 900,
        S3_DOCUMENTS_DOWNLOAD_EXPIRES_SECONDS: 300,
        S3_DOCUMENTS_KEY_PREFIX: 'documents',
        MINIO_TEST_STORAGE_ENABLED: false,
        SGP_PII_PGCRYPTO_KEY: undefined,
        SGP_PII_PGCRYPTO_KEY_ID: undefined,
      }),
    );
  });

  it('derives Cognito issuer and JWKS URL from region and pool id', () => {
    const issuer = buildCognitoIssuer('sa-east-1', 'pool-1');

    expect(issuer).toBe('https://cognito-idp.sa-east-1.amazonaws.com/pool-1');
    expect(buildCognitoJwksUri(issuer)).toBe(
      'https://cognito-idp.sa-east-1.amazonaws.com/pool-1/.well-known/jwks.json',
    );
    expect(
      validateEnvironment({
        COGNITO_REGION: 'sa-east-1',
        COGNITO_USER_POOL_ID: 'pool-1',
        COGNITO_TOKEN_USE: 'id',
      }),
    ).toEqual(
      expect.objectContaining({
        COGNITO_ISSUER: issuer,
        COGNITO_JWKS_URI: `${issuer}/.well-known/jwks.json`,
        COGNITO_TOKEN_USE: 'id',
      }),
    );
  });

  it('rejects invalid URLs, integers, token-use values, and partial Cognito config', () => {
    expect(() =>
      validateEnvironment({
        PORT: '0',
        COGNITO_REGION: 'sa-east-1',
        COGNITO_TOKEN_USE: 'refresh',
        S3_ENDPOINT: 'not a url',
      }),
    ).toThrow(
      'Invalid backend configuration: COGNITO_TOKEN_USE must be either access or id when set; COGNITO_USER_POOL_ID is required when COGNITO_REGION is set; PORT must be a positive integer; S3_ENDPOINT must be a valid URL',
    );
  });

  it('normalizes document bucket S3 URIs for AWS SDK usage', () => {
    expect(
      validateEnvironment({
        S3_DOCUMENTS_BUCKET: 's3://sgp-docs.detran-am.sistematech.com.br/',
      }),
    ).toEqual(
      expect.objectContaining({
        S3_DOCUMENTS_BUCKET: 'sgp-docs.detran-am.sistematech.com.br',
      }),
    );
  });

  it('rejects S3 bucket URI values with object prefixes', () => {
    expect(() =>
      validateEnvironment({
        S3_DOCUMENTS_BUCKET: 's3://sgp-docs.detran-am.sistematech.com.br/prod',
      }),
    ).toThrow(
      'Invalid backend configuration: S3_DOCUMENTS_BUCKET must not include an object prefix',
    );
  });
});
