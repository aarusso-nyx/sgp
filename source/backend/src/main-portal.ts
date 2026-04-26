import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppPortalModule } from './app-portal.module';

async function bootstrap() {
  const app = await NestFactory.create(AppPortalModule);
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:4200'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGP Portal API')
    .setDescription('Read-only SGP portal API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/portal-docs', app, document);

  await app.listen(process.env.PORTAL_API_PORT ?? 3001);
}
void bootstrap();
