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
import { PayrollEngineController } from './payroll-engine.controller';
import { PayrollEngineService } from './payroll-engine.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
  ],
  controllers: [PayrollEngineController],
  providers: [
    PayrollEngineService,
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
export class PayrollEngineModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
