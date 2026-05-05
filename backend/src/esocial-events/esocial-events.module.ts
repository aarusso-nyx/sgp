import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { EsocialEventsService } from './esocial-events.service';

@Module({
  imports: [DatabaseModule],
  providers: [EsocialEventsService],
  exports: [EsocialEventsService],
})
export class EsocialEventsModule {}

export { EsocialEventsService };
export type {
  EsocialEventsListFilters,
  EsocialEventsRecord,
  EsocialEventsSourceRef,
} from './esocial-events.types';
