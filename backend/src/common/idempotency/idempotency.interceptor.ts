import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

import type { RequestWithContext } from '../request-id/request-with-context';
import {
  IDEMPOTENT_METADATA_KEY,
  type IdempotencyOptions,
} from './idempotency.decorator';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotency: IdempotencyService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<
      IdempotencyOptions | undefined
    >(IDEMPOTENT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!options || context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    const rawKey = request.header('idempotency-key');
    if (!rawKey) {
      return next.handle();
    }

    const keyHash = this.idempotency.keyHash(rawKey);
    const requestHash = this.idempotency.requestHash({
      body: (request.body as unknown) ?? null,
      method: request.method,
      params: toUnknownRecord(request.params),
      path: requestRoutePath(request),
      query: toUnknownRecord(request.query),
    });

    return from(this.idempotency.reserve(keyHash, requestHash, options)).pipe(
      mergeMap((reservation) => {
        if (reservation.kind === 'replay') {
          response.status(reservation.snapshot.statusCode);
          response.setHeader('Idempotency-Status', 'replayed');
          return of(reservation.snapshot.body);
        }

        if (reservation.kind === 'processing') {
          response.setHeader(
            'Retry-After',
            String(reservation.retryAfterSeconds),
          );
          throw new ConflictException('Idempotency-Key is already processing');
        }

        if (reservation.reclaimed) {
          response.setHeader('Idempotency-Status', 'reclaimed');
        }

        return next.handle().pipe(
          mergeMap((body) =>
            from(
              this.idempotency.complete(
                keyHash,
                requestHash,
                {
                  body,
                  statusCode: response.statusCode,
                },
                options,
              ),
            ).pipe(mergeMap(() => of(body))),
          ),
          catchError((error: unknown) =>
            from(this.idempotency.fail(keyHash, requestHash)).pipe(
              mergeMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }
}

function requestRoutePath(request: RequestWithContext): string {
  const route = (request as { route?: unknown }).route;
  if (
    route &&
    typeof route === 'object' &&
    'path' in route &&
    typeof route.path === 'string'
  ) {
    return route.path;
  }

  return request.path ?? request.originalUrl;
}

function toUnknownRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
