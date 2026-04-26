import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DocumentsController } from './documents.controller';
import { DocumentsStorageService } from './documents-storage.service';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsStorageService],
  exports: [DocumentsStorageService],
})
export class DocumentsModule {}
