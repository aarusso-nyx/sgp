import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { AudespSpAdapter } from './adapters/audesp-sp/audesp-sp.adapter';
import { AudespSpController } from './adapters/audesp-sp/audesp-sp.controller';
import { AudespSpSubmissionService } from './adapters/audesp-sp/audesp-sp.submission.service';
import { PayrollToAudespMapper } from './adapters/audesp-sp/mapping/payroll-to-audesp.mapper';
import { AudespXmlSerializer } from './adapters/audesp-sp/serializer/audesp-xml.serializer';
import { AudespStubServerService } from './adapters/audesp-sp/stub/audesp-stub-server.service';
import { AudespValidatorService } from './adapters/audesp-sp/validator/audesp-validator.service';
import { NoopStubAdapter } from './examples/noop-stub.adapter';
import { CatalogController } from './catalog/catalog.controller';
import { LayoutFieldService } from './catalog/layout-field.service';
import { LayoutVersionService } from './catalog/layout-version.service';
import { StateService } from './catalog/state.service';
import { LifecycleEmitterService } from './lifecycle/lifecycle-emitter.service';
import { TceCircuitBreakerService } from './queue/circuit-breaker.service';
import { TceQueueEnqueueService } from './queue/enqueue.service';
import { TceRetryStrategyService } from './queue/retry-strategy.service';
import { TceQueueController } from './queue/tce-queue.controller';
import { TceWorkerService } from './queue/tce-worker.service';
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
      : [NoopStubAdapter as Type<unknown>, AudespSpAdapter as Type<unknown>];
    return {
      module: TceModule,
      imports: [AuditModule, DatabaseModule, DiscoveryModule],
      controllers: [
        TceController,
        CatalogController,
        AudespSpController,
        TceQueueController,
      ],
      providers: [
        AdapterRegistryService,
        AdapterLoaderService,
        LifecycleEmitterService,
        StateService,
        LayoutVersionService,
        LayoutFieldService,
        AudespSpSubmissionService,
        PayrollToAudespMapper,
        AudespXmlSerializer,
        AudespStubServerService,
        AudespValidatorService,
        TceQueueEnqueueService,
        TceRetryStrategyService,
        TceCircuitBreakerService,
        TceWorkerService,
        ...adapterProviders,
      ],
      exports: [
        AdapterRegistryService,
        AdapterLoaderService,
        LifecycleEmitterService,
        TceQueueEnqueueService,
        TceWorkerService,
      ],
    };
  }
}
