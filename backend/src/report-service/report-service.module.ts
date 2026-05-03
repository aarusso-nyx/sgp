import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { StandardExceptionFilter } from '../common/errors/standard-exception.filter';
import { LgpdModule } from '../common/lgpd/lgpd.module';
import { createLoggingModule } from '../common/logging/logging.config';
import { createRateLimitOptions } from '../common/rate-limit/rate-limit.config';
import { RequestIdMiddleware } from '../common/request-id/request-id.middleware';
import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { PadesAdapter } from '../external/signature/pades.adapter';
import { PdfABuilderService } from './payslip/pdf-a-builder.service';
import { PayslipController } from './payslip/payslip.controller';
import { PayslipRenderService } from './payslip/payslip-render.service';
import { YearlyIncomeBatchService } from './yearly-income/yearly-income-batch.service';
import { YearlyIncomeController } from './yearly-income/yearly-income.controller';
import { YearlyIncomeRenderService } from './yearly-income/yearly-income-render.service';
import { ReportServiceController } from './report-service.controller';
import { ReportRuntimeService } from './report-service.service';
import { ReportWorkerService } from './report-worker.service';

@Module({
  imports: [
    createLoggingModule('sgp-report-service'),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      useFactory: createRateLimitOptions,
    }),
    DatabaseModule,
    LgpdModule,
    DocumentsModule,
  ],
  controllers: [
    ReportServiceController,
    PayslipController,
    YearlyIncomeController,
  ],
  providers: [
    ReportRuntimeService,
    PadesAdapter,
    PdfABuilderService,
    PayslipRenderService,
    YearlyIncomeRenderService,
    YearlyIncomeBatchService,
    ReportWorkerService,
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [
    PadesAdapter,
    PdfABuilderService,
    PayslipRenderService,
    YearlyIncomeRenderService,
    YearlyIncomeBatchService,
  ],
})
export class ReportServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
