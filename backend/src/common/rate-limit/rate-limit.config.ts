import type { INestApplication } from '@nestjs/common';
import type {
  ThrottlerModuleOptions,
  ThrottlerOptions,
} from '@nestjs/throttler';

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_IP_LIMIT = 120;
const DEFAULT_TENANT_LIMIT = 600;

type RequestLike = {
  actor?: { tenantId?: string | null } | null | undefined;
  tenantId?: string | null | undefined;
  ip?: string | undefined;
  ips?: string[] | undefined;
  socket?: { remoteAddress?: string } | undefined;
  headers?: Record<string, string | string[] | undefined>;
};

function optionalBoolean(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.toLowerCase() ?? '');
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function firstHeader(
  headers: RequestLike['headers'],
  name: string,
): string | undefined {
  const value = headers?.[name];
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return value?.trim() || undefined;
}

function forwardedClientIp(request: RequestLike): string | undefined {
  return firstHeader(request.headers, 'x-forwarded-for')?.split(',')[0]?.trim();
}

function requestIp(request: RequestLike): string {
  return (
    forwardedClientIp(request) ??
    request.ips?.[0] ??
    request.ip ??
    request.socket?.remoteAddress ??
    'unknown-ip'
  );
}

function requestTenant(request: RequestLike): string | undefined {
  return (
    request.actor?.tenantId ??
    request.tenantId ??
    firstHeader(request.headers, 'x-tenant-id') ??
    firstHeader(request.headers, 'x-sgp-tenant-id')
  );
}

function tenantTracker(request: RequestLike): string {
  return requestTenant(request) ?? `anonymous:${requestIp(request)}`;
}

export function createRateLimitOptions(): ThrottlerModuleOptions {
  const ipTtl = positiveIntFromEnv(
    'SGP_RATE_LIMIT_IP_TTL_MS',
    DEFAULT_WINDOW_MS,
  );
  const ipLimit = positiveIntFromEnv(
    'SGP_RATE_LIMIT_IP_LIMIT',
    DEFAULT_IP_LIMIT,
  );
  const tenantTtl = positiveIntFromEnv('SGP_RATE_LIMIT_TENANT_TTL_MS', ipTtl);
  const tenantLimit = positiveIntFromEnv(
    'SGP_RATE_LIMIT_TENANT_LIMIT',
    Math.max(DEFAULT_TENANT_LIMIT, ipLimit + 1),
  );

  if (tenantLimit <= ipLimit) {
    throw new Error(
      'SGP_RATE_LIMIT_TENANT_LIMIT must be higher than SGP_RATE_LIMIT_IP_LIMIT',
    );
  }

  const throttlers: ThrottlerOptions[] = [
    {
      name: 'ip',
      ttl: ipTtl,
      limit: ipLimit,
      getTracker: (request: RequestLike) => requestIp(request),
    },
    {
      name: 'tenant',
      ttl: tenantTtl,
      limit: tenantLimit,
      getTracker: (request: RequestLike) => tenantTracker(request),
    },
  ];

  return {
    throttlers,
  };
}

export function configureRateLimitEntrypoint(app: INestApplication): void {
  if (!optionalBoolean(process.env.SGP_RATE_LIMIT_TRUST_PROXY)) return;

  const instance = app.getHttpAdapter().getInstance() as {
    set?: (name: string, value: unknown) => void;
  };
  instance.set?.('trust proxy', true);
}
