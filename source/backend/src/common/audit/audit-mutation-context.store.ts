import { AsyncLocalStorage } from 'node:async_hooks';

interface AuditMutationContext {
  required: boolean;
  count: number;
}

const store = new AsyncLocalStorage<AuditMutationContext>();

export const AuditMutationContextStore = {
  run<T>(required: boolean, fn: () => T): T {
    return store.run({ required, count: 0 }, fn);
  },

  markMutationAudited(): void {
    const context = store.getStore();
    if (!context?.required) return;
    context.count += 1;
  },

  auditedCount(): number {
    return store.getStore()?.count ?? 0;
  },
};
