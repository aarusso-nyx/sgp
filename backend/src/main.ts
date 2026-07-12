import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { createOpenApi31Document } from './common/openapi/openapi31';
import { createSgpStynxHttpRuntime } from './stynx/stynx-runtime.factory';

export async function bootstrap() {
  const app = await createSgpStynxHttpRuntime(AppModule, 'sgp-core-api');

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
