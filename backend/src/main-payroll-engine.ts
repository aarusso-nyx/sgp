import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { configureCorsEntrypoint } from './common/bootstrap/cors.config';
import { usePinoLogger } from './common/logging/bootstrap-logger';
import { configureOpenTelemetryTracingEntrypoint } from './common/observability/otel.tracing';
import { configurePrometheusMetricsEntrypoint } from './common/observability/prometheus.metrics';
import { createOpenApi31Document } from './common/openapi/openapi31';
import { configureRateLimitEntrypoint } from './common/rate-limit/rate-limit.config';
import { PayrollEngineModule } from './payroll-engine/payroll-engine.module';

export async function bootstrap() {
  const app = await NestFactory.create(PayrollEngineModule, {
    bufferLogs: true,
  });
  usePinoLogger(app);
  configureRateLimitEntrypoint(app);
  configureOpenTelemetryTracingEntrypoint(app, 'sgp-payroll-engine');
  configurePrometheusMetricsEntrypoint(app, 'sgp-payroll-engine');
  app.use(helmet());
  app.setGlobalPrefix('api');
  configureCorsEntrypoint(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGP Payroll Engine')
    .setDescription('Folia-first payroll calculation runtime')
    .setVersion('0.1.0')
    .build();
  const document = createOpenApi31Document(app, swaggerConfig);
  SwaggerModule.setup('api/payroll-engine-docs', app, document);

  await app.listen(process.env.PAYROLL_ENGINE_PORT ?? process.env.PORT ?? 3302);
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
