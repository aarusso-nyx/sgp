import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { Cnab240EmitService } from './cnab240/cnab240-emit.service';
import { IntegrationsWorkerService } from './integrations-worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    DocumentsModule,
  ],
  providers: [IntegrationsWorkerService, Cnab240EmitService],
  exports: [IntegrationsWorkerService],
})
export class IntegrationsWorkerModule {}
