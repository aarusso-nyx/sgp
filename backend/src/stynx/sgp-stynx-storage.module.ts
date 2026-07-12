import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { STYNX_OBJECT_STORAGE, StynxStorageModule } from '@stynx-nyx/backend';

import { DocumentsStorageService } from '../documents/documents-storage.service';

const PLACEHOLDER_STORAGE = {
  presignUpload: () =>
    Promise.resolve({
      method: 'PUT' as const,
      url: '',
      expiresInSeconds: 0,
    }),
  presignDownload: () =>
    Promise.resolve({
      url: '',
      expiresInSeconds: 0,
    }),
  exists: () => Promise.resolve(false),
};

@Module({})
export class SgpStynxStorageModule {
  static forRoot(): DynamicModule {
    const stynxModule = StynxStorageModule.forRoot({
      objectStorage: PLACEHOLDER_STORAGE,
    });
    return {
      ...stynxModule,
      imports: [...(stynxModule.imports ?? []), ConfigModule],
      providers: [
        DocumentsStorageService,
        ...(stynxModule.providers ?? []).map(rebindStorage),
      ],
      exports: [DocumentsStorageService, ...(stynxModule.exports ?? [])],
    };
  }
}

function rebindStorage(provider: Provider): Provider {
  if (
    provider &&
    typeof provider === 'object' &&
    'provide' in provider &&
    provider.provide === STYNX_OBJECT_STORAGE
  ) {
    return {
      provide: STYNX_OBJECT_STORAGE,
      useExisting: DocumentsStorageService,
    };
  }
  return provider;
}
