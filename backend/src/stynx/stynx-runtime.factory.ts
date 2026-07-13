import type {
  INestApplication,
  INestApplicationContext,
  Type,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StynxLogger } from '@stynx-nyx/logging';
import helmet from 'helmet';

import { configureCorsEntrypoint } from '../common/bootstrap/cors.config';
import { configureOpenTelemetryTracingEntrypoint } from '../common/observability/otel.tracing';
import { configurePrometheusMetricsEntrypoint } from '../common/observability/prometheus.metrics';
import { configureRateLimitEntrypoint } from '../common/rate-limit/rate-limit.config';

export async function createSgpStynxHttpRuntime(
  rootModule: Type<unknown>,
  serviceName: string,
): Promise<INestApplication> {
  const app = await NestFactory.create(rootModule, { bufferLogs: true });
  app.useLogger(app.get(StynxLogger));
  configureRateLimitEntrypoint(app);
  configureOpenTelemetryTracingEntrypoint(app, serviceName);
  configurePrometheusMetricsEntrypoint(app, serviceName);
  app.use(helmet());
  app.setGlobalPrefix('api');
  configureCorsEntrypoint(app);
  return app;
}

export async function createSgpStynxWorkerRuntime(
  rootModule: Type<unknown>,
): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(rootModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(StynxLogger));
  return app;
}
