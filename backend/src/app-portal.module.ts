import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { createAppCoreProviders } from './common/bootstrap/app-providers';
import { createRateLimitOptions } from './common/rate-limit/rate-limit.config';
import { RequestIdMiddleware } from './common/request-id/request-id.middleware';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PortalModule } from './portal/portal.module';
import { SgpStynxRuntimeModule } from './stynx/stynx-runtime.module';

@Module({
  imports: [
    SgpStynxRuntimeModule.forRoot({ serviceName: 'sgp-portal-api' }),
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
  providers: createAppCoreProviders(),
})
export class AppPortalModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
