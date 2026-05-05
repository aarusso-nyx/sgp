import { Module } from '@nestjs/common';

import { EsocialSpoolModule } from '../../esocial-spool';
import { StynxEsocialAuditConsumer } from './audit-consumer.service';
import { StynxEsocialSpoolUpdateConsumer } from './spool-update-consumer.service';
import { StynxEsocialClient } from './stynx-esocial.client';
import {
  StynxEsocialAdminGatewayController,
  StynxEsocialGatewayController,
} from './stynx-esocial-gateway.controller';

@Module({
  imports: [EsocialSpoolModule],
  controllers: [
    StynxEsocialGatewayController,
    StynxEsocialAdminGatewayController,
  ],
  providers: [
    StynxEsocialClient,
    StynxEsocialAuditConsumer,
    StynxEsocialSpoolUpdateConsumer,
  ],
  exports: [StynxEsocialClient],
})
export class StynxEsocialModule {}
