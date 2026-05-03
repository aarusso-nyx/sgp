import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App as SupertestApp } from 'supertest/types';

import {
  configureRateLimitEntrypoint,
  createRateLimitOptions,
} from './rate-limit.config';
import { Public } from '../../iam/decorators/require-permission.decorator';

@Controller('v1/rate-limit-test')
class RateLimitTestController {
  @Get('ping')
  @Public()
  ping() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: createRateLimitOptions,
    }),
  ],
  controllers: [RateLimitTestController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
class RateLimitTestModule {}

describe('rate limit configuration', () => {
  const previousEnv = {
    ipLimit: process.env.SGP_RATE_LIMIT_IP_LIMIT,
    ipTtl: process.env.SGP_RATE_LIMIT_IP_TTL_MS,
    tenantLimit: process.env.SGP_RATE_LIMIT_TENANT_LIMIT,
    tenantTtl: process.env.SGP_RATE_LIMIT_TENANT_TTL_MS,
    trustProxy: process.env.SGP_RATE_LIMIT_TRUST_PROXY,
  };
  let app: INestApplication | undefined;

  function server(): SupertestApp {
    return app?.getHttpAdapter().getInstance() as SupertestApp;
  }

  beforeEach(async () => {
    process.env.SGP_RATE_LIMIT_IP_LIMIT = '1';
    process.env.SGP_RATE_LIMIT_IP_TTL_MS = '60000';
    process.env.SGP_RATE_LIMIT_TENANT_LIMIT = '2';
    process.env.SGP_RATE_LIMIT_TENANT_TTL_MS = '60000';

    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitTestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    restoreEnv('SGP_RATE_LIMIT_IP_LIMIT', previousEnv.ipLimit);
    restoreEnv('SGP_RATE_LIMIT_IP_TTL_MS', previousEnv.ipTtl);
    restoreEnv('SGP_RATE_LIMIT_TENANT_LIMIT', previousEnv.tenantLimit);
    restoreEnv('SGP_RATE_LIMIT_TENANT_TTL_MS', previousEnv.tenantTtl);
    restoreEnv('SGP_RATE_LIMIT_TRUST_PROXY', previousEnv.trustProxy);
  });

  it('keeps the tenant bucket higher than the per-IP bucket', () => {
    const options = createRateLimitOptions();

    expect(Array.isArray(options)).toBe(false);
    if (Array.isArray(options)) return;

    const ipLimit = options.throttlers.find(({ name }) => name === 'ip');
    const tenantLimit = options.throttlers.find(
      ({ name }) => name === 'tenant',
    );

    expect(ipLimit?.limit).toBe(1);
    expect(tenantLimit?.limit).toBe(2);
  });

  it('returns 429 when the per-IP limit is exceeded', async () => {
    await request(server())
      .get('/api/v1/rate-limit-test/ping')
      .set('x-forwarded-for', '192.0.2.10')
      .set('x-tenant-id', 'tenant-a')
      .expect(200);

    await request(server())
      .get('/api/v1/rate-limit-test/ping')
      .set('x-forwarded-for', '192.0.2.10')
      .set('x-tenant-id', 'tenant-b')
      .expect(429);
  });

  it('returns 429 when the per-tenant limit is exceeded across IPs', async () => {
    await request(server())
      .get('/api/v1/rate-limit-test/ping')
      .set('x-forwarded-for', '192.0.2.21')
      .set('x-tenant-id', 'tenant-c')
      .expect(200);
    await request(server())
      .get('/api/v1/rate-limit-test/ping')
      .set('x-forwarded-for', '192.0.2.22')
      .set('x-tenant-id', 'tenant-c')
      .expect(200);

    await request(server())
      .get('/api/v1/rate-limit-test/ping')
      .set('x-forwarded-for', '192.0.2.23')
      .set('x-tenant-id', 'tenant-c')
      .expect(429);
  });

  it('enables Express trust proxy only when configured', () => {
    const set = jest.fn();
    const target = {
      getHttpAdapter: () => ({
        getInstance: () => ({ set }),
      }),
    } as unknown as INestApplication;

    configureRateLimitEntrypoint(target);
    expect(set).not.toHaveBeenCalled();

    process.env.SGP_RATE_LIMIT_TRUST_PROXY = 'true';
    configureRateLimitEntrypoint(target);
    expect(set).toHaveBeenCalledWith('trust proxy', true);
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
