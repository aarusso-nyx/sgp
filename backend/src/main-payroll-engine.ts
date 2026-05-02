import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { PayrollEngineModule } from './payroll-engine/payroll-engine.module';

async function bootstrap() {
  const app = await NestFactory.create(PayrollEngineModule);
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:4200'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGP Payroll Engine')
    .setDescription('Folia-first payroll calculation runtime')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/payroll-engine-docs', app, document);

  await app.listen(process.env.PAYROLL_ENGINE_PORT ?? process.env.PORT ?? 3302);
}

void bootstrap();
