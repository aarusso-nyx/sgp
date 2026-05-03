import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { ESocialWorkerModule } from '../../esocial-worker/esocial-worker.module';
import { EfdReinfBuilderService } from './efd-reinf-builder.service';
import { EfdReinfController } from './efd-reinf.controller';
import { EfdReinfReceiptService } from './efd-reinf-receipt.service';
import { EfdReinfSignerService } from './efd-reinf-signer.service';
import { EfdReinfTransmitterService } from './efd-reinf-transmitter.service';

@Module({
  imports: [AuditModule, DatabaseModule, ESocialWorkerModule],
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
