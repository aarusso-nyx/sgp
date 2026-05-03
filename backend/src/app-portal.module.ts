import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AuditRequiredInterceptor } from './common/audit/audit-required.interceptor';
import { StandardExceptionFilter } from './common/errors/standard-exception.filter';
import { createLoggingModule } from './common/logging/logging.config';
import { createRateLimitOptions } from './common/rate-limit/rate-limit.config';
import { RequestIdMiddleware } from './common/request-id/request-id.middleware';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PermissionGuard } from './iam/guards/permission.guard';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
    createLoggingModule('sgp-portal-api'),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      useFactory: createRateLimitOptions,
    }),
    AuthModule,
    AuditModule,
    DatabaseModule,
    PortalModule,
    HealthModule,
  ],
  providers: [
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
      provide: APP_INTERCEPTOR,
      useClass: AuditRequiredInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppPortalModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
