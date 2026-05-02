import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { PisPasepController } from './pis-pasep.controller';
import { PisPasepService } from './pis-pasep.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PisPasepController],
  providers: [PisPasepService],
  exports: [PisPasepService],
})
export class PisPasepModule {}
