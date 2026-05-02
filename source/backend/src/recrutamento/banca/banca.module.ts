import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ExternalModule } from '../../external/external.module';
import {
  BancaController,
  PublicBancaVerifyController,
} from './banca.controller';
import { BancaService } from './banca.service';
import { DocumentSigningService } from './document-signing.service';

@Module({
  imports: [DatabaseModule, ExternalModule],
  controllers: [BancaController, PublicBancaVerifyController],
  providers: [BancaService, DocumentSigningService],
  exports: [BancaService, DocumentSigningService],
})
export class BancaModule {}
