import type { INestApplication } from '@nestjs/common';

const LOCAL_DEVELOPMENT_ORIGIN = 'http://localhost:4200';

type CorsEnvironment = {
  CORS_ORIGIN?: string;
  NODE_ENV?: string;
};

type CorsConfiguration = {
  origin: string[];
  credentials: true;
};

function splitOrigins(value: string | undefined): string[] {
  return (
    value
      ?.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0) ?? []
  );
}

export function resolveCorsOrigins(
  env: CorsEnvironment = process.env,
): string[] {
  const origins = splitOrigins(env.CORS_ORIGIN);
  if (origins.length > 0) return origins;

  if (env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN is required when NODE_ENV=production');
  }

  return [LOCAL_DEVELOPMENT_ORIGIN];
}

export function createCorsConfiguration(
  env: CorsEnvironment = process.env,
): CorsConfiguration {
  return {
    origin: resolveCorsOrigins(env),
    credentials: true,
  };
}

export function configureCorsEntrypoint(app: INestApplication): void {
  app.enableCors(createCorsConfiguration());
}
