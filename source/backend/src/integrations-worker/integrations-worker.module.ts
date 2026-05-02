import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { NomeacaoService } from '../recrutamento/nomeacao/nomeacao.service';
import { Cnab240EmitService } from './cnab240/cnab240-emit.service';
import { PortabilityController } from './consignment-portability/portability.controller';
import { PortabilityParserService } from './consignment-portability/portability-parser.service';
import { PortabilityProcessService } from './consignment-portability/portability-process.service';
import { IntegrationsWorkerService } from './integrations-worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    DocumentsModule,
  ],
  controllers: [PortabilityController],
  providers: [
    IntegrationsWorkerService,
    Cnab240EmitService,
    NomeacaoService,
    PortabilityParserService,
    PortabilityProcessService,
  ],
  exports: [IntegrationsWorkerService],
})
export class IntegrationsWorkerModule {}
