import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { FgtsController } from './fgts.controller';
import { FgtsService } from './fgts.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FgtsController],
  providers: [FgtsService],
  exports: [FgtsService],
})
export class FgtsModule {}
