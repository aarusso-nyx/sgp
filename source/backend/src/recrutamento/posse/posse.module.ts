import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ESocialWorkerModule } from '../../esocial-worker/esocial-worker.module';
import { PosseController } from './posse.controller';
import { PosseService } from './posse.service';

@Module({
  imports: [DatabaseModule, ESocialWorkerModule],
  controllers: [PosseController],
  providers: [PosseService],
  exports: [PosseService],
})
export class PosseModule {}
