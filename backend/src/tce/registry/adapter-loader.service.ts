import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import {
  TCE_ADAPTER_METADATA,
  TceAdapterMetadata,
} from '../contracts/tce-adapter.decorator';
import { TceAdapter } from '../contracts/tce-adapter.interface';
import { AdapterRegistryService } from './adapter-registry.service';
import { domainError } from '../../common/errors/domain-error';

interface DiscoveredProvider {
  instance?: unknown;
  metatype?: unknown;
}

@Injectable()
export class AdapterLoaderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdapterLoaderService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly registry: AdapterRegistryService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.discoverAndRegister();
  }

  async discoverAndRegister(): Promise<TceAdapter[]> {
    const adapters = this.discoverAdapters();
    for (const adapter of adapters) {
      try {
        await this.registry.register(adapter);
      } catch (error) {
        this.logger.warn(
          `TCE adapter ${adapter.id()} was discovered but not registered: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return adapters;
  }

  discoverAdapters(): TceAdapter[] {
    const adapters: TceAdapter[] = [];
    for (const wrapper of this.discoveryService.getProviders() as DiscoveredProvider[]) {
      const instance = wrapper.instance;
      if (!isTceAdapter(instance)) continue;
      const metadata = Reflect.getMetadata(
        TCE_ADAPTER_METADATA,
        wrapper.metatype ?? instance.constructor,
      ) as TceAdapterMetadata | undefined;
      if (!metadata) continue;
      this.assertMetadataMatchesInstance(metadata, instance);
      adapters.push(instance);
    }
    return adapters.sort((left, right) => left.id().localeCompare(right.id()));
  }

  private assertMetadataMatchesInstance(
    metadata: TceAdapterMetadata,
    adapter: TceAdapter,
  ): void {
    if (
      metadata.id !== adapter.id() ||
      metadata.state_code !== adapter.state_code() ||
      metadata.organ_kind !== adapter.organ_kind()
    ) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        `TCE adapter metadata does not match instance: ${adapter.id()}`,
      );
    }
  }
}

function isTceAdapter(value: unknown): value is TceAdapter {
  if (!value || typeof value !== 'object') return false;
  try {
    const candidate = value as Partial<Record<keyof TceAdapter, unknown>>;
    return (
      typeof candidate.id === 'function' &&
      typeof candidate.state_code === 'function' &&
      typeof candidate.organ_kind === 'function' &&
      typeof candidate.supported_layouts === 'function' &&
      typeof candidate.validate === 'function' &&
      typeof candidate.serialize === 'function' &&
      typeof candidate.submit === 'function' &&
      typeof candidate.parseResponse === 'function' &&
      typeof candidate.health === 'function'
    );
  } catch {
    return false;
  }
}
