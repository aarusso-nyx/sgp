import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

import { AuditService } from '../../audit/audit.service';
import type { RequestWithContext } from '../request-id/request-with-context';
import {
  AUDIT_MUTATION_METADATA,
  AuditMutationMetadata,
} from './audit-mutation.decorator';
import { AuditMutationContextStore } from './audit-mutation-context.store';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ENFORCED_ENVS = new Set(['development', 'dev', 'test']);

@Injectable()
export class AuditRequiredInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.shouldEnforce(context)) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const metadata = this.reflector.getAllAndOverride<AuditMutationMetadata>(
      AUDIT_MUTATION_METADATA,
      [context.getHandler(), context.getClass()],
    );

    return new Observable((subscriber) =>
      AuditMutationContextStore.run(true, () => {
        const subscription = next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error: unknown) => subscriber.error(error),
          complete: () => {
            void this.completeAuditedRequest(context, request, metadata)
              .then(() => subscriber.complete())
              .catch((error: unknown) => subscriber.error(error));
          },
        });

        return () => subscription.unsubscribe();
      }),
    );
  }

  private async completeAuditedRequest(
    context: ExecutionContext,
    request: RequestWithContext,
    metadata: AuditMutationMetadata | undefined,
  ): Promise<void> {
    if (AuditMutationContextStore.auditedCount() === 0 && metadata) {
      await this.auditService.auditMutation(
        request,
        metadata.action ?? this.actionFromMethod(request.method),
        metadata.resourceType,
        {
          tableName: metadata.tableName,
          resourceId: this.resourceId(request),
          reason: this.reason(request, metadata),
          metadata: {
            controller: context.getClass().name,
            handler: context.getHandler().name,
            fallback: 'audit-required-interceptor',
          },
        },
      );
    }

    if (AuditMutationContextStore.auditedCount() === 0) {
      throw new InternalServerErrorException(
        'Mutating request completed without sgp_append_audit_event audit entry',
      );
    }
  }

  private shouldEnforce(context: ExecutionContext): boolean {
    if (!ENFORCED_ENVS.has(process.env.NODE_ENV ?? 'development')) {
      return false;
    }
    const request = context.switchToHttp().getRequest<{ method?: string }>();
    return MUTATING_METHODS.has(String(request.method ?? '').toUpperCase());
  }

  private actionFromMethod(
    method?: string,
  ): 'CREATE' | 'UPDATE' | 'DELETE' | 'PROCESS' {
    switch (String(method ?? '').toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'DELETE':
        return 'DELETE';
      case 'PUT':
      case 'PATCH':
      default:
        return 'UPDATE';
    }
  }

  private resourceId(request: RequestWithContext): string | undefined {
    const params = request.params as Record<string, string | undefined>;
    return (
      params?.id ??
      params?.job_id ??
      params?.user_id ??
      params?.profile_id ??
      undefined
    );
  }

  private reason(
    request: RequestWithContext,
    metadata: AuditMutationMetadata,
  ): string | undefined {
    const body = request.body as Record<string, unknown> | undefined;
    const reason = body?.['reason'];
    if (typeof reason === 'string' && reason.trim()) return reason.trim();
    if (!metadata.reasonRequired) return undefined;
    throw new InternalServerErrorException(
      'Sensitive mutating request completed without audit reason',
    );
  }
}
