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
import { ReportServiceController } from './report-service.controller';
import { ReportRuntimeService } from './report-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    IntegrationsWorkerModule,
  ],
  controllers: [ReportServiceController],
  providers: [
    ReportRuntimeService,
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
