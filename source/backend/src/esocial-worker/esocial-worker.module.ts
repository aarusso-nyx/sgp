import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/environment';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { CertificateStoreController } from './certificate-store/certificate-store.controller';
import { CertificateStoreService } from './certificate-store/certificate-store.service';
import { ESocialEmitService } from './esocial-emit.service';
import { ESocialDispatchAdapter } from './esocial-dispatch.adapter';
import { ESocialWorkerService } from './esocial-worker.service';
import { IcpSignerService } from './signature/icp-signer.service';
import { XsdValidatorService } from './xsd/xsd-validator.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    AuditModule,
    DatabaseModule,
    DocumentsModule,
  ],
  controllers: [CertificateStoreController],
  providers: [
    CertificateStoreService,
    ESocialDispatchAdapter,
    ESocialEmitService,
    ESocialWorkerService,
    IcpSignerService,
    XsdValidatorService,
  ],
  exports: [
    CertificateStoreService,
    ESocialEmitService,
    ESocialWorkerService,
    IcpSignerService,
    XsdValidatorService,
  ],
})
export class ESocialWorkerModule {}
