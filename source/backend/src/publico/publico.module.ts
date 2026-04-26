import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { PublicTransparencyController } from './public-transparency.controller';
import { PublicTransparencyService } from './public-transparency.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicTransparencyController],
  providers: [PublicTransparencyService],
})
export class PublicoModule {}
