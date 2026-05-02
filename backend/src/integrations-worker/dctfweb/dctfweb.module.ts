import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { ESocialWorkerModule } from '../../esocial-worker/esocial-worker.module';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { DctfwebController } from './dctfweb.controller';
import { DctfwebReceiptService } from './dctfweb-receipt.service';
import { DctfwebSignerService } from './dctfweb-signer.service';
import { DctfwebTransmitterService } from './dctfweb-transmitter.service';

@Module({
  imports: [AuditModule, DatabaseModule, ESocialWorkerModule],
  controllers: [DctfwebController],
  providers: [
    DctfwebBuilderService,
    DctfwebReceiptService,
    DctfwebSignerService,
    DctfwebTransmitterService,
  ],
  exports: [
    DctfwebBuilderService,
    DctfwebReceiptService,
    DctfwebSignerService,
    DctfwebTransmitterService,
  ],
})
export class DctfwebModule {}
