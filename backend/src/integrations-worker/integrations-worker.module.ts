import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditModule } from '../audit/audit.module';
import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { NomeacaoService } from '../recrutamento/nomeacao/nomeacao.service';
import { Cnab240EmitService } from './cnab240/cnab240-emit.service';
import { Cnab240ReturnController } from './cnab240/return/cnab240-return.controller';
import { Cnab240ReturnParserService } from './cnab240/return/cnab240-return-parser.service';
import { Cnab240ReturnProcessService } from './cnab240/return/cnab240-return-process.service';
import { OccurrenceMapperService } from './cnab240/return/occurrence-mapper.service';
import { PortabilityController } from './consignment-portability/portability.controller';
import { PortabilityParserService } from './consignment-portability/portability-parser.service';
import { PortabilityProcessService } from './consignment-portability/portability-process.service';
import { DctfwebModule } from './dctfweb/dctfweb.module';
import { DirfModule } from './dirf/dirf.module';
import { GpsModule } from './gps/gps.module';
import { IntegrationsWorkerService } from './integrations-worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    AuditModule,
    DatabaseModule,
    DocumentsModule,
    DctfwebModule,
    DirfModule,
    GpsModule,
  ],
  controllers: [PortabilityController, Cnab240ReturnController],
  providers: [
    IntegrationsWorkerService,
    Cnab240EmitService,
    Cnab240ReturnParserService,
    Cnab240ReturnProcessService,
    OccurrenceMapperService,
    NomeacaoService,
    PortabilityParserService,
    PortabilityProcessService,
  ],
  exports: [IntegrationsWorkerService],
})
export class IntegrationsWorkerModule {}
