import { AsyncLocalStorage } from 'node:async_hooks';

import type { AuthenticatedActor } from '../../auth/actor.types';

export interface RequestContextSnapshot {
  requestId?: string;
  tenantId?: string;
  actor?: AuthenticatedActor;
  permissions?: string[];
  groups?: string[];
  bypassRls?: boolean;
  bypassRlsReason?: string;
}

const store = new AsyncLocalStorage<RequestContextSnapshot>();

export const RequestContextStore = {
  run<T>(seed: RequestContextSnapshot, fn: () => T): T {
    return store.run(seed, fn);
  },
  setActor(actor: AuthenticatedActor): void {
    const current = store.getStore();
    if (!current) return;
    current.actor = actor;
    current.tenantId = actor.tenantId;
  },
  setTenantId(tenantId: string): void {
    const current = store.getStore();
    if (!current) return;
    current.tenantId = tenantId;
  },
  get(): RequestContextSnapshot | undefined {
    return store.getStore();
  },
};
