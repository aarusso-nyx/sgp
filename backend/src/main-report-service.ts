import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { createOpenApi31Document } from './common/openapi/openapi31';
import { ReportServiceModule } from './report-service/report-service.module';
import { createSgpStynxHttpRuntime } from './stynx/stynx-runtime.factory';

export async function bootstrap() {
  const app = await createSgpStynxHttpRuntime(
    ReportServiceModule,
    'sgp-report-service',
  );

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
