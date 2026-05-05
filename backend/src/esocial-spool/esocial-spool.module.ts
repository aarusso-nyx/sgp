import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { EsocialSpoolService } from './esocial-spool.service';

@Module({
  imports: [DatabaseModule],
  providers: [EsocialSpoolService],
  exports: [EsocialSpoolService],
})
export class EsocialSpoolModule {}

export { EsocialSpoolService };
export type {
  EsocialSpoolListFilters,
  EsocialSpoolRecord,
  EsocialSpoolSourceRef,
} from './esocial-spool.types';
