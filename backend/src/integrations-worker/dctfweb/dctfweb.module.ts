import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalModule } from '../../external/external.module';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { DctfwebController } from './dctfweb.controller';
import { DctfwebReceiptService } from './dctfweb-receipt.service';
import { DctfwebSignerService } from './dctfweb-signer.service';
import { DctfwebTransmitterService } from './dctfweb-transmitter.service';
import { MitInclusionService } from './mit-inclusion.service';

@Module({
  imports: [AuditModule, DatabaseModule, ExternalModule],
  controllers: [DctfwebController],
  providers: [
    DctfwebBuilderService,
    DctfwebReceiptService,
    DctfwebSignerService,
    DctfwebTransmitterService,
    MitInclusionService,
  ],
  exports: [
    DctfwebBuilderService,
    DctfwebReceiptService,
    DctfwebSignerService,
    DctfwebTransmitterService,
    MitInclusionService,
  ],
})
export class DctfwebModule {}
