import { AsyncLocalStorage } from 'node:async_hooks';

import type { AuthenticatedActor } from '../../auth/actor.types';
import { requestId, RequestId, tenantId, TenantId } from '../types/branded-ids';

export interface RequestContextSnapshot {
  requestId?: RequestId | undefined;
  tenantId?: TenantId | undefined;
  actor?: AuthenticatedActor | undefined;
  permissions?: string[] | undefined;
  groups?: string[] | undefined;
  bypassRls?: boolean | undefined;
  bypassRlsReason?: string | undefined;
}

export interface RequestContextSeed extends Omit<
  RequestContextSnapshot,
  'requestId' | 'tenantId'
> {
  requestId?: RequestId | string | undefined;
  tenantId?: TenantId | string | undefined;
}

const store = new AsyncLocalStorage<RequestContextSnapshot>();

export const RequestContextStore = {
  run<T>(seed: RequestContextSeed, fn: () => T): T {
    return store.run(normalizeSeed(seed), fn);
  },
  setActor(actor: AuthenticatedActor): void {
    const current = store.getStore();
    if (!current) return;
    current.actor = actor;
    current.tenantId = tenantId(actor.tenantId);
  },
  setTenantId(value: TenantId | string): void {
    const current = store.getStore();
    if (!current) return;
    current.tenantId = tenantId(value);
  },
  get(): RequestContextSnapshot | undefined {
    return store.getStore();
  },
};

function normalizeSeed(seed: RequestContextSeed): RequestContextSnapshot {
  return {
    ...seed,
    requestId: seed.requestId ? requestId(seed.requestId) : undefined,
    tenantId: seed.tenantId ? tenantId(seed.tenantId) : undefined,
  };
}
