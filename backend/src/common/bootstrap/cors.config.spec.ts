import { createCorsConfiguration, resolveCorsOrigins } from './cors.config';

describe('CORS entrypoint configuration', () => {
  it('keeps localhost as the development fallback', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'development' })).toEqual([
      'http://localhost:4200',
    ]);
  });

  it('parses a comma-separated origin allowlist', () => {
    expect(
      createCorsConfiguration({
        NODE_ENV: 'production',
        CORS_ORIGIN:
          'https://admin.example.gov.br, https://portal.example.gov.br',
      }),
    ).toEqual({
      origin: ['https://admin.example.gov.br', 'https://portal.example.gov.br'],
      credentials: true,
    });
  });

  it('fails closed when production has no explicit CORS_ORIGIN', () => {
    expect(() => resolveCorsOrigins({ NODE_ENV: 'production' })).toThrow(
      'CORS_ORIGIN is required when NODE_ENV=production',
    );
  });
});
