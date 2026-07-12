import type { DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  STYNX_DB_CONTEXT_APPLIER,
  StynxDbContextModule,
} from '@stynx-nyx/backend';

import { SgpDbSessionContextApplier } from './sgp-db-session-context.applier';

const UNREACHABLE_APPLIER = {
  apply: () => Promise.resolve(),
};

export function createSgpStynxDataModule(): DynamicModule {
  const stynxModule = StynxDbContextModule.forRoot({
    applier: UNREACHABLE_APPLIER,
  });

  return {
    ...stynxModule,
    imports: [...(stynxModule.imports ?? []), ConfigModule],
    providers: [
      SgpDbSessionContextApplier,
      ...(stynxModule.providers ?? []).map(rebindSgpContextApplier),
    ],
    exports: [
      SgpDbSessionContextApplier,
      ...(stynxModule.exports ?? []).filter(
        (exported) => exported !== STYNX_DB_CONTEXT_APPLIER,
      ),
      STYNX_DB_CONTEXT_APPLIER,
    ],
  };
}

function rebindSgpContextApplier(provider: Provider): Provider {
  if (
    provider &&
    typeof provider === 'object' &&
    'provide' in provider &&
    provider.provide === STYNX_DB_CONTEXT_APPLIER
  ) {
    return {
      provide: STYNX_DB_CONTEXT_APPLIER,
      useExisting: SgpDbSessionContextApplier,
    };
  }
  return provider;
}
