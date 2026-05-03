import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SiaficConnectorService } from './siafic-connector.service';
import { SiaficSyncService } from './siafic-sync.service';

@Module({
  imports: [DatabaseModule],
  providers: [SiaficConnectorService, SiaficSyncService],
  exports: [SiaficConnectorService, SiaficSyncService],
})
export class SiaficModule {}
