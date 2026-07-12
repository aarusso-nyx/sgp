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
import { createLoggingModule } from '../common/logging/logging.config';
import { createRateLimitOptions } from '../common/rate-limit/rate-limit.config';
import { RequestIdMiddleware } from '../common/request-id/request-id.middleware';
import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { FormulaCacheService } from './formula-cache.service';
import { FormulaCompilerService } from './formula-compiler.service';
import { PayrollEngineController } from './payroll-engine.controller';
import { PayrollEngineService } from './payroll-engine.service';
import { SgpStynxRuntimeModule } from '../stynx/stynx-runtime.module';

@Module({
  imports: [
    SgpStynxRuntimeModule.forRoot({ serviceName: 'sgp-payroll-engine' }),
    createLoggingModule('sgp-payroll-engine'),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      useFactory: createRateLimitOptions,
    }),
    DatabaseModule,
  ],
  controllers: [PayrollEngineController],
  providers: [
    PayrollEngineService,
    FormulaCompilerService,
    FormulaCacheService,
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
  exports: [PayrollEngineService, FormulaCompilerService, FormulaCacheService],
})
export class PayrollEngineModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
