import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { StynxEsocialModule } from '../../integrations/stynx-esocial';
import { PosseController } from './posse.controller';
import { PosseService } from './posse.service';

@Module({
  imports: [DatabaseModule, StynxEsocialModule],
  controllers: [PosseController],
  providers: [PosseService],
  exports: [PosseService],
})
export class PosseModule {}
