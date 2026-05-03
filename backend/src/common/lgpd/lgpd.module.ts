import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { LgpdLegalBasisService } from './legal-basis.service';

@Module({
  imports: [DatabaseModule],
  providers: [LgpdLegalBasisService],
  exports: [LgpdLegalBasisService],
})
export class LgpdModule {}
