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

  const context = (method: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method, headers: {}, params: {} }),
      }),
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
    }) as never;

  it('fails mutating handlers without sgp_append_audit_event in dev mode', async () => {
    process.env.NODE_ENV = 'development';
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
});
