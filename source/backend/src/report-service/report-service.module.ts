import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';

import { StandardExceptionFilter } from '../common/errors/standard-exception.filter';
import { RequestIdMiddleware } from '../common/request-id/request-id.middleware';
import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { IntegrationsWorkerModule } from '../integrations-worker/integrations-worker.module';
import { PdfABuilderService } from './payslip/pdf-a-builder.service';
import { PayslipController } from './payslip/payslip.controller';
import { PayslipRenderService } from './payslip/payslip-render.service';
import { YearlyIncomeBatchService } from './yearly-income/yearly-income-batch.service';
import { YearlyIncomeController } from './yearly-income/yearly-income.controller';
import { YearlyIncomeRenderService } from './yearly-income/yearly-income-render.service';
import { ReportServiceController } from './report-service.controller';
import { ReportRuntimeService } from './report-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    IntegrationsWorkerModule,
  ],
  controllers: [
    ReportServiceController,
    PayslipController,
    YearlyIncomeController,
  ],
  providers: [
    ReportRuntimeService,
    PdfABuilderService,
    PayslipRenderService,
    YearlyIncomeRenderService,
    YearlyIncomeBatchService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
    {
      provide: APP_FILTER,
      useClass: StandardExceptionFilter,
    },
  ],
})
export class ReportServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
