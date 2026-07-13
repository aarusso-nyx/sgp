import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SgpStynxStorageModule } from '../stynx/sgp-stynx-storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

const sgpStynxStorageModule = SgpStynxStorageModule.forRoot();

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule, sgpStynxStorageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [sgpStynxStorageModule],
})
export class DocumentsModule {}
