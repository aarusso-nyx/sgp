import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { ReportServiceModule } from './report-service/report-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ReportServiceModule);
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:4200'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGP Report Service')
    .setDescription('Dedicated report generation runtime')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/report-service-docs', app, document);

  await app.listen(process.env.REPORT_SERVICE_PORT ?? process.env.PORT ?? 3305);
}

void bootstrap();
