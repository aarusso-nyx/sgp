import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { configureCorsEntrypoint } from './common/bootstrap/cors.config';
import { usePinoLogger } from './common/logging/bootstrap-logger';
import { configureOpenTelemetryTracingEntrypoint } from './common/observability/otel.tracing';
import { configurePrometheusMetricsEntrypoint } from './common/observability/prometheus.metrics';
import { createOpenApi31Document } from './common/openapi/openapi31';
import { configureRateLimitEntrypoint } from './common/rate-limit/rate-limit.config';
import { ReportServiceModule } from './report-service/report-service.module';

export async function bootstrap() {
  const app = await NestFactory.create(ReportServiceModule, {
    bufferLogs: true,
  });
  usePinoLogger(app);
  configureRateLimitEntrypoint(app);
  configureOpenTelemetryTracingEntrypoint(app, 'sgp-report-service');
  configurePrometheusMetricsEntrypoint(app, 'sgp-report-service');
  app.use(helmet());
  app.setGlobalPrefix('api');
  configureCorsEntrypoint(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGP Report Service')
    .setDescription('Dedicated report generation runtime')
    .setVersion('0.1.0')
    .build();
  const document = createOpenApi31Document(app, swaggerConfig);
  SwaggerModule.setup('api/report-service-docs', app, document);

  await app.listen(process.env.REPORT_SERVICE_PORT ?? process.env.PORT ?? 3305);
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
