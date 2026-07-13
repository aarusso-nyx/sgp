import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { createOpenApi31Document } from './common/openapi/openapi31';
import { PayrollEngineModule } from './payroll-engine/payroll-engine.module';
import { createSgpStynxHttpRuntime } from './stynx/stynx-runtime.factory';

export async function bootstrap() {
  const app = await createSgpStynxHttpRuntime(
    PayrollEngineModule,
    'sgp-payroll-engine',
  );

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
