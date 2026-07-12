import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { STYNX_DB_CONTEXT_APPLIER } from '@stynx-nyx/backend';

import { SgpDbSessionContextApplier } from './sgp-db-session-context.applier';
import { createSgpStynxDataModule } from './sgp-stynx-data.module';

describe('SGP STYNX data composition', () => {
  it('binds the STYNX DB context contract to the SGP transaction-local adapter', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, createSgpStynxDataModule()],
    }).compile();

    const adapter = moduleRef.get(SgpDbSessionContextApplier);
    expect(moduleRef.get(STYNX_DB_CONTEXT_APPLIER)).toBe(adapter);

    await moduleRef.close();
  });
});
