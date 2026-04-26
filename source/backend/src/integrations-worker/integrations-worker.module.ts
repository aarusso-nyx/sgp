import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { IntegrationsWorkerService } from './integrations-worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    DocumentsModule,
  ],
  providers: [IntegrationsWorkerService],
  exports: [IntegrationsWorkerService],
})
export class IntegrationsWorkerModule {}
