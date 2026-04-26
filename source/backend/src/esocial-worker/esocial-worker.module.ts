import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { ESocialDispatchAdapter } from './esocial-dispatch.adapter';
import { ESocialWorkerService } from './esocial-worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    DocumentsModule,
  ],
  providers: [ESocialDispatchAdapter, ESocialWorkerService],
  exports: [ESocialWorkerService],
})
export class ESocialWorkerModule {}
