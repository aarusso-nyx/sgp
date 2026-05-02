import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { NoopStubAdapter } from './examples/noop-stub.adapter';
import { CatalogController } from './catalog/catalog.controller';
import { LayoutFieldService } from './catalog/layout-field.service';
import { LayoutVersionService } from './catalog/layout-version.service';
import { StateService } from './catalog/state.service';
import { LifecycleEmitterService } from './lifecycle/lifecycle-emitter.service';
import { AdapterLoaderService } from './registry/adapter-loader.service';
import { AdapterRegistryService } from './registry/adapter-registry.service';
import { TceController } from './tce.controller';

export interface TceModuleOptions {
  adapters?: Provider[];
}

@Module({})
export class TceModule {
  static register(options: TceModuleOptions = {}): DynamicModule {
    const adapterProviders = options.adapters?.length
      ? options.adapters
      : [NoopStubAdapter as Type<unknown>];
    return {
      module: TceModule,
      imports: [AuditModule, DatabaseModule, DiscoveryModule],
      controllers: [TceController, CatalogController],
      providers: [
        AdapterRegistryService,
        AdapterLoaderService,
        LifecycleEmitterService,
        StateService,
        LayoutVersionService,
        LayoutFieldService,
        ...adapterProviders,
      ],
      exports: [
        AdapterRegistryService,
        AdapterLoaderService,
        LifecycleEmitterService,
      ],
    };
  }
}
