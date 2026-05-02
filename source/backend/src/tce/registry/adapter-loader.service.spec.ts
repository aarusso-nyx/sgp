import { DiscoveryService } from '@nestjs/core';

import { NoopStubAdapter } from '../examples/noop-stub.adapter';
import { AdapterLoaderService } from './adapter-loader.service';

describe('AdapterLoaderService', () => {
  it('discovers the noop adapter and registers it', async () => {
    const noop = new NoopStubAdapter();
    const discovery = {
      getProviders: () => [{ instance: noop }],
    } as Partial<DiscoveryService>;
    const registry = {
      register: jest.fn().mockResolvedValue({ adapterId: 'noop' }),
    };
    const service = new AdapterLoaderService(
      discovery as DiscoveryService,
      registry as never,
    );

    const adapters = await service.discoverAndRegister();

    expect(adapters.map((adapter) => adapter.id())).toEqual(['noop']);
    expect(registry.register).toHaveBeenCalledWith(noop);
  });
});
