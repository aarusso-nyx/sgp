import { ValidationPipe, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import {
  SgpStynxAuthGuard,
  SgpStynxAuthorizationGuard,
} from '../../auth/sgp-stynx-auth.guard';
import { AuditRequiredInterceptor } from '../audit/audit-required.interceptor';
import { StandardExceptionFilter } from '../errors/standard-exception.filter';
import { IdempotencyInterceptor } from '../idempotency/idempotency.interceptor';
import { IdempotencyService } from '../idempotency/idempotency.service';

export function createAppCoreProviders(): Provider[] {
  return [
    IdempotencyService,
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
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SgpStynxAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SgpStynxAuthorizationGuard,
    },
  ];
}
