import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSgpStynxDataModule } from '../stynx/sgp-stynx-data.module';
import { DatabaseService } from './database.service';

const sgpStynxDataModule = createSgpStynxDataModule();

@Module({
  imports: [ConfigModule, sgpStynxDataModule],
  providers: [DatabaseService],
  exports: [DatabaseService, sgpStynxDataModule],
})
export class DatabaseModule {}
