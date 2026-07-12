import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { StynxPlatformPipelineModule } from '@stynx-nyx/backend';
import { StynxHealthModule } from '@stynx-nyx/health';
import { StynxLoggingModule } from '@stynx-nyx/logging';

import { LOGGER_REDACT_PATHS } from '../common/logging/logging.config';

export type SgpStynxRuntimeOptions = {
  serviceName: string;
};

@Module({})
export class SgpStynxRuntimeModule {
  static forRoot(options: SgpStynxRuntimeOptions): DynamicModule {
    const loggingModule = preserveSgpHttpContracts(
      StynxLoggingModule.forRoot({
        level:
          process.env.LOG_LEVEL ??
          (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
        additionalRedactPaths: [...LOGGER_REDACT_PATHS],
      }),
    );

    return {
      module: SgpStynxRuntimeModule,
      imports: [
        loggingModule,
        StynxHealthModule.forRoot({
          appInfo: { name: options.serviceName, version: '0.1.0' },
        }),
        StynxPlatformPipelineModule.forRoot({
          rateLimit: false,
          sla: false,
          idempotency: false,
        }),
      ],
      exports: [
        StynxHealthModule,
        StynxLoggingModule,
        StynxPlatformPipelineModule,
      ],
    };
  }
}

function preserveSgpHttpContracts(module: DynamicModule): DynamicModule {
  return {
    ...module,
    ...(module.imports
      ? {
          imports: module.imports.map((importedModule) => {
            if (!isDynamicModule(importedModule)) return importedModule;
            return {
              ...importedModule,
              ...(importedModule.providers
                ? {
                    providers: importedModule.providers.filter(
                      (provider) => !isConflictingGlobalEnhancer(provider),
                    ),
                  }
                : {}),
            };
          }),
        }
      : {}),
  };
}

function isDynamicModule(value: unknown): value is DynamicModule {
  return Boolean(value && typeof value === 'object' && 'module' in value);
}

function isConflictingGlobalEnhancer(provider: Provider): boolean {
  if (!provider || typeof provider !== 'object' || !('provide' in provider)) {
    return false;
  }
  return (
    provider.provide === APP_FILTER || provider.provide === APP_INTERCEPTOR
  );
}
