import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalModule } from '../../external/external.module';
import { DctfwebBuilderService } from './dctfweb-builder.service';
import { DctfwebController } from './dctfweb.controller';
import { DctfwebMitSectionService } from './dctfweb-mit-section.service';
import { DctfwebReceiptService } from './dctfweb-receipt.service';
import { DctfwebSignerService } from './dctfweb-signer.service';
import { DctfwebTransmitterService } from './dctfweb-transmitter.service';
import { DctfwebTotalizerSectionService } from './dctfweb-totalizer-section.service';
import { MitInclusionService } from './mit-inclusion.service';

@Module({
  imports: [AuditModule, DatabaseModule, ExternalModule],
  controllers: [DctfwebController],
  providers: [
    DctfwebBuilderService,
    DctfwebMitSectionService,
    DctfwebReceiptService,
    DctfwebSignerService,
    DctfwebTotalizerSectionService,
    DctfwebTransmitterService,
    MitInclusionService,
  ],
  exports: [
    DctfwebBuilderService,
    DctfwebMitSectionService,
    DctfwebReceiptService,
    DctfwebSignerService,
    DctfwebTotalizerSectionService,
    DctfwebTransmitterService,
    MitInclusionService,
  ],
})
export class DctfwebModule {}
