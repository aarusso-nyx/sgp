import { APP_FILTER } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { AppPortalModule } from '../../app-portal.module';
import { PayrollEngineModule } from '../../payroll-engine/payroll-engine.module';
import { ReportServiceModule } from '../../report-service/report-service.module';
import { StandardExceptionFilter } from './standard-exception.filter';

describe('standard error contract registration', () => {
  it('registers the standard exception filter on every HTTP module', () => {
    for (const moduleType of [
      AppModule,
      AppPortalModule,
      PayrollEngineModule,
      ReportServiceModule,
    ]) {
      const metadata = Reflect.getMetadata('providers', moduleType) as
        | Array<{ provide?: unknown; useClass?: unknown }>
        | undefined;
      expect(metadata).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            provide: APP_FILTER,
            useClass: StandardExceptionFilter,
          }),
        ]),
      );
    }
  });
});
