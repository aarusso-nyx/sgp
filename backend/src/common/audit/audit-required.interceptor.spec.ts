import { InternalServerErrorException } from '@nestjs/common';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';

import { AuditMutationContextStore } from './audit-mutation-context.store';
import { AuditRequiredInterceptor } from './audit-required.interceptor';

describe('AuditRequiredInterceptor', () => {
  const previousEnv = process.env.NODE_ENV;
  const auditService = {
    auditMutation: jest.fn().mockResolvedValue(undefined),
  };
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  afterEach(() => {
    process.env.NODE_ENV = previousEnv;
    jest.clearAllMocks();
  });

  const context = (
    method: string,
    requestOverrides: Record<string, unknown> = {},
    className = 'TestController',
    handlerName = 'handler',
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers: {},
          params: {},
          ...requestOverrides,
        }),
      }),
      getHandler: () => ({ name: handlerName }),
      getClass: () => ({ name: className }),
    }) as never;

  it.each(['development', 'test', 'production'])(
    'fails mutating handlers without sgp_append_audit_event in %s mode',
    async (nodeEnv) => {
      process.env.NODE_ENV = nodeEnv;
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const interceptor = new AuditRequiredInterceptor(
        auditService as never,
        reflector as never,
      );

      await expect(
        lastValueFrom(
          interceptor.intercept(context('POST'), {
            handle: () => of({ ok: true }),
          }),
        ),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    },
  );

  it('fails mutating handlers without sgp_append_audit_event when NODE_ENV is unset', async () => {
    delete process.env.NODE_ENV;
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const interceptor = new AuditRequiredInterceptor(
      auditService as never,
      reflector as never,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(context('POST'), {
          handle: () => of({ ok: true }),
        }),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('passes mutating handlers once an audit mutation is recorded', async () => {
    process.env.NODE_ENV = 'test';
    const interceptor = new AuditRequiredInterceptor(
      auditService as never,
      reflector as never,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(context('PATCH'), {
          handle: () => {
            AuditMutationContextStore.markMutationAudited();
            return of({ ok: true });
          },
        }),
      ),
    ).resolves.toEqual({ ok: true });
  });

  it('does not enforce read-only handlers', async () => {
    process.env.NODE_ENV = 'test';
    const interceptor = new AuditRequiredInterceptor(
      auditService as never,
      reflector as never,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(context('GET'), {
          handle: () => of({ ok: true }),
        }),
      ),
    ).resolves.toEqual({ ok: true });
  });

  it('appends a fallback audit event for declared mutating handlers', async () => {
    process.env.NODE_ENV = 'test';
    auditService.auditMutation.mockImplementation(async () => {
      AuditMutationContextStore.markMutationAudited();
    });
    reflector.getAllAndOverride.mockReturnValue({
      resourceType: 'declared_resource',
      tableName: 'declared_table',
    });
    const interceptor = new AuditRequiredInterceptor(
      auditService as never,
      reflector as never,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(context('POST'), {
          handle: () => of({ ok: true }),
        }),
      ),
    ).resolves.toEqual({ ok: true });

    expect(auditService.auditMutation).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST' }),
      'CREATE',
      'declared_resource',
      expect.objectContaining({ tableName: 'declared_table' }),
    );
  });

  it.each([
    ['DELETE', { id: 'resource-1' }, 'DELETE', 'resource-1'],
    ['PUT', { job_id: 'job-1' }, 'UPDATE', 'job-1'],
    ['PATCH', { user_id: 'user-1' }, 'UPDATE', 'user-1'],
    ['POST', { profile_id: 'profile-1' }, 'CREATE', 'profile-1'],
  ])(
    'records fallback audit details for %s route params',
    async (method, params, action, resourceId) => {
      auditService.auditMutation.mockImplementation(async () => {
        AuditMutationContextStore.markMutationAudited();
      });
      reflector.getAllAndOverride.mockReturnValue({
        resourceType: 'declared_resource',
        tableName: 'declared_table',
        reasonRequired: true,
      });
      const interceptor = new AuditRequiredInterceptor(
        auditService as never,
        reflector as never,
      );

      await expect(
        lastValueFrom(
          interceptor.intercept(
            context(method, {
              baseUrl: '/api',
              body: { reason: '  owner approved  ' },
              params,
              route: { path: '/declared/:id' },
            }),
            {
              handle: () => of({ ok: true }),
            },
          ),
        ),
      ).resolves.toEqual({ ok: true });

      expect(auditService.auditMutation).toHaveBeenLastCalledWith(
        expect.objectContaining({ method }),
        action,
        'declared_resource',
        expect.objectContaining({
          resourceId,
          reason: 'owner approved',
        }),
      );
    },
  );

  it('uses request path fallback when route metadata is unavailable', async () => {
    auditService.auditMutation.mockImplementation(async () => {
      AuditMutationContextStore.markMutationAudited();
    });
    reflector.getAllAndOverride.mockReturnValue({
      resourceType: 'declared_resource',
      tableName: 'declared_table',
    });
    const interceptor = new AuditRequiredInterceptor(
      auditService as never,
      reflector as never,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context('PATCH', {
            path: '/api/fallback-path',
            body: { reason: 'ignored when optional' },
          }),
          {
            handle: () => of({ ok: true }),
          },
        ),
      ),
    ).resolves.toEqual({ ok: true });

    expect(auditService.auditMutation).toHaveBeenLastCalledWith(
      expect.objectContaining({ method: 'PATCH' }),
      'UPDATE',
      'declared_resource',
      expect.objectContaining({
        reason: 'ignored when optional',
      }),
    );
  });

  it('uses originalUrl fallback and rejects missing required audit reason', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resourceType: 'sensitive_resource',
      reasonRequired: true,
    });
    const interceptor = new AuditRequiredInterceptor(
      auditService as never,
      reflector as never,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context('POST', {
            body: { reason: '   ' },
            originalUrl: '/api/sensitive?tab=audit',
          }),
          {
            handle: () => of({ ok: true }),
          },
        ),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
