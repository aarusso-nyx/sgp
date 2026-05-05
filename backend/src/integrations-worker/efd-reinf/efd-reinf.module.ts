import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalModule } from '../../external/external.module';
import { EfdReinfBuilderService } from './efd-reinf-builder.service';
import { EfdReinfController } from './efd-reinf.controller';
import { EfdReinfReceiptService } from './efd-reinf-receipt.service';
import { EfdReinfSignerService } from './efd-reinf-signer.service';
import { EfdReinfTransmitterService } from './efd-reinf-transmitter.service';

@Module({
  imports: [AuditModule, DatabaseModule, ExternalModule],
  controllers: [EfdReinfController],
  providers: [
    EfdReinfBuilderService,
    EfdReinfReceiptService,
    EfdReinfSignerService,
    EfdReinfTransmitterService,
  ],
  exports: [
    EfdReinfBuilderService,
    EfdReinfReceiptService,
    EfdReinfSignerService,
    EfdReinfTransmitterService,
  ],
})
export class EfdReinfModule {}
