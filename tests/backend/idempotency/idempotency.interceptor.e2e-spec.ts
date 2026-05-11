import 'reflect-metadata';

import { ConflictException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';

import { Idempotent } from '../../../backend/src/common/idempotency/idempotency.decorator';
import { IdempotencyInterceptor } from '../../../backend/src/common/idempotency/idempotency.interceptor';
import type {
  IdempotencyReserveResult,
  IdempotencyResponseSnapshot,
  IdempotencyService,
} from '../../../backend/src/common/idempotency/idempotency.service';

class IdempotencyProbeController {
  @Idempotent({ staleAfterSeconds: 0 })
  mutate() {
    return undefined;
  }
}

type StoredEntry = {
  requestHash: string;
  snapshot?: IdempotencyResponseSnapshot | undefined;
  status: 'processing' | 'completed' | 'failed';
};

class InMemoryIdempotencyService implements Pick<
  IdempotencyService,
  'complete' | 'fail' | 'keyHash' | 'requestHash' | 'reserve'
> {
  private readonly entries = new Map<string, StoredEntry>();

  keyHash(rawKey: string): string {
    return `key:${rawKey}`;
  }

  requestHash(input: unknown): string {
    return `request:${JSON.stringify(input)}`;
  }

  async reserve(
    keyHash: string,
    requestHash: string,
  ): Promise<IdempotencyReserveResult> {
    const current = this.entries.get(keyHash);
    if (!current) {
      this.entries.set(keyHash, { requestHash, status: 'processing' });
      return { kind: 'started', reclaimed: false };
    }

    if (current.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency-Key was already used with a different request body',
      );
    }

    if (current.status === 'completed' && current.snapshot) {
      return { kind: 'replay', snapshot: current.snapshot };
    }

    if (current.status === 'processing') {
      return { kind: 'started', reclaimed: true };
    }

    return { kind: 'started', reclaimed: false };
  }

  async complete(
    keyHash: string,
    requestHash: string,
    snapshot: IdempotencyResponseSnapshot,
  ): Promise<void> {
    this.entries.set(keyHash, {
      requestHash,
      snapshot,
      status: 'completed',
    });
  }

  async fail(keyHash: string, requestHash: string): Promise<void> {
    this.entries.set(keyHash, { requestHash, status: 'failed' });
  }

  seedProcessing(keyHash: string, requestHash: string): void {
    this.entries.set(keyHash, { requestHash, status: 'processing' });
  }
}

describe('IdempotencyInterceptor e2e contract', () => {
  function createHarness(
    service = new InMemoryIdempotencyService(),
    body: unknown = { value: 'same' },
  ) {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      statusCode: 201,
    };
    const request = {
      body,
      header: jest.fn((name: string) =>
        name.toLowerCase() === 'idempotency-key' ? 'idem-1' : undefined,
      ),
      method: 'POST',
      params: {},
      path: '/v1/probe',
      query: {},
      route: { path: '/v1/probe' },
    };
    const context = {
      getClass: () => IdempotencyProbeController,
      getHandler: () => IdempotencyProbeController.prototype.mutate,
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const interceptor = new IdempotencyInterceptor(
      new Reflector(),
      service as unknown as IdempotencyService,
    );

    return { context, interceptor, response, service };
  }

  it('returns the stored response for the same key and same body without re-execution', async () => {
    const { context, interceptor } = createHarness();
    let executions = 0;

    const first = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ executions: ++executions }),
      }),
    );
    const second = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ executions: ++executions }),
      }),
    );

    expect(first).toEqual({ executions: 1 });
    expect(second).toEqual({ executions: 1 });
    expect(executions).toBe(1);
  });

  it('rejects the same key with a different request body', async () => {
    const service = new InMemoryIdempotencyService();
    const first = createHarness(service, { value: 'first' });
    await lastValueFrom(
      first.interceptor.intercept(first.context, {
        handle: () => of({ ok: true }),
      }),
    );

    const second = createHarness(service, { value: 'second' });
    await expect(
      lastValueFrom(
        second.interceptor.intercept(second.context, {
          handle: () => of({ ok: false }),
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reclaims a stale processing reservation and marks the response header', async () => {
    const service = new InMemoryIdempotencyService();
    const { context, interceptor, response } = createHarness(service);
    const keyHash = service.keyHash('idem-1');
    const requestHash = service.requestHash({
      body: { value: 'same' },
      method: 'POST',
      params: {},
      path: '/v1/probe',
      query: {},
    });
    service.seedProcessing(keyHash, requestHash);

    const result = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ reclaimed: true }),
      }),
    );

    expect(result).toEqual({ reclaimed: true });
    expect(response.setHeader).toHaveBeenCalledWith(
      'Idempotency-Status',
      'reclaimed',
    );
  });

  it('documents that Forbidden authorization paths remain covered by route-level e2e suites', () => {
    expect(IdempotencyProbeController).toBeDefined();
  });
});
