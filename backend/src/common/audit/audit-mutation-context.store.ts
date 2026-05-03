import { AsyncLocalStorage } from 'node:async_hooks';

interface AuditMutationContext {
  required: boolean;
  count: number;
  labels: AuditMutationLabels;
}

export interface AuditMutationLabels {
  controller: string;
  route: string;
}

const store = new AsyncLocalStorage<AuditMutationContext>();

export const AuditMutationContextStore = {
  run<T>(
    required: boolean,
    fn: () => T,
    labels: AuditMutationLabels = { controller: 'unknown', route: 'unknown' },
  ): T {
    return store.run({ required, count: 0, labels }, fn);
  },

  markMutationAudited(): void {
    const context = store.getStore();
    if (!context?.required) return;
    context.count += 1;
  },

  auditedCount(): number {
    return store.getStore()?.count ?? 0;
  },

  labels(): AuditMutationLabels | undefined {
    return store.getStore()?.labels;
  },
};
