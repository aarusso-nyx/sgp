import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { configureCorsEntrypoint } from './common/bootstrap/cors.config';
import { usePinoLogger } from './common/logging/bootstrap-logger';
import { configureOpenTelemetryTracingEntrypoint } from './common/observability/otel.tracing';
import { configurePrometheusMetricsEntrypoint } from './common/observability/prometheus.metrics';
import { createOpenApi31Document } from './common/openapi/openapi31';
import { configureRateLimitEntrypoint } from './common/rate-limit/rate-limit.config';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  usePinoLogger(app);
  configureRateLimitEntrypoint(app);
  configureOpenTelemetryTracingEntrypoint(app, 'sgp-core-api');
  configurePrometheusMetricsEntrypoint(app, 'sgp-core-api');
  app.use(helmet());
  app.setGlobalPrefix('api');
  configureCorsEntrypoint(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGP API')
    .setDescription('Modern SGP NestJS API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = createOpenApi31Document(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
