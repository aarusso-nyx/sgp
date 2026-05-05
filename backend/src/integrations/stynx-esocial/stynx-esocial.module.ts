import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { EsocialEventsModule } from '../../esocial-events';
import { StynxEsocialAuditConsumer } from './audit-consumer.service';
import { StynxEsocialEventsUpdateConsumer } from './spool-update-consumer.service';
import { StynxEsocialClient } from './stynx-esocial.client';
import { StynxEsocialAdminGatewayController } from './stynx-esocial-gateway.controller';

@Module({
  imports: [DatabaseModule, EsocialEventsModule],
  controllers: [StynxEsocialAdminGatewayController],
  providers: [
    StynxEsocialClient,
    StynxEsocialAuditConsumer,
    StynxEsocialEventsUpdateConsumer,
  ],
  exports: [StynxEsocialClient],
})
export class StynxEsocialModule {}
