import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { STYNX_OBJECT_STORAGE } from '@stynx-nyx/backend';

import { DocumentsStorageService } from '../documents/documents-storage.service';
import { SgpStynxStorageModule } from './sgp-stynx-storage.module';

describe('SGP STYNX storage composition', () => {
  it('binds object storage to the SGP key and S3 adapter', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), SgpStynxStorageModule.forRoot()],
    }).compile();

    expect(moduleRef.get(STYNX_OBJECT_STORAGE)).toBe(
      moduleRef.get(DocumentsStorageService),
    );
    await moduleRef.close();
  });
});
