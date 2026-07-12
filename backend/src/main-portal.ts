import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppPortalModule } from './app-portal.module';
import { createOpenApi31Document } from './common/openapi/openapi31';
import { createSgpStynxHttpRuntime } from './stynx/stynx-runtime.factory';

export async function bootstrap() {
  const app = await createSgpStynxHttpRuntime(
    AppPortalModule,
    'sgp-portal-api',
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SGP Portal API')
    .setDescription('Read-only SGP portal API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = createOpenApi31Document(app, swaggerConfig);
  SwaggerModule.setup('api/portal-docs', app, document);

  await app.listen(process.env.PORTAL_API_PORT ?? 3001);
}
if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
