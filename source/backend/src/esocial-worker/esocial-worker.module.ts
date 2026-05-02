import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/environment';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { DocumentsModule } from '../documents/documents.module';
import { CertificateStoreController } from './certificate-store/certificate-store.controller';
import { CertificateStoreService } from './certificate-store/certificate-store.service';
import { ES03Controller } from './builders/es03.controller';
import { ES03Service } from './builders/es03.service';
import { S1000Builder } from './builders/s1000.builder';
import { S1005Builder } from './builders/s1005.builder';
import { S1010Builder } from './builders/s1010.builder';
import { S1020Builder } from './builders/s1020.builder';
import { S1050Builder } from './builders/s1050.builder';
import { S1070Builder } from './builders/s1070.builder';
import { S1xxxController } from './builders/s1xxx.controller';
import { S1xxxDispatchService } from './builders/s1xxx-common';
import { S1xxxService } from './builders/s1xxx.service';
import { S2200Builder } from './builders/s2200.builder';
import { S2205Builder } from './builders/s2205.builder';
import { S2230Builder } from './builders/s2230.builder';
import { S2299Builder } from './builders/s2299.builder';
import { S3000Builder } from './builders/s3000.builder';
import { S22xxController } from './builders/s22xx.controller';
import { S22xxDispatchService } from './builders/s22xx-common';
import { S22xxService } from './builders/s22xx.service';
import { ESocialEmitService } from './esocial-emit.service';
import { ESocialWorkerService } from './esocial-worker.service';
import { S3000Controller } from './exclusion/s3000.controller';
import { S3000Service } from './exclusion/s3000.service';
import { IcpSignerService } from './signature/icp-signer.service';
import { BatchBuilderService } from './submission/batch-builder.service';
import { CircuitBreakerService } from './submission/circuit-breaker.service';
import { RetryStrategyService } from './submission/retry-strategy.service';
import { SoapClientService } from './submission/soap-client.service';
import { SubmissionController } from './submission/submission.controller';
import { SubmissionService } from './submission/submission.service';
import { XsdValidatorService } from './xsd/xsd-validator.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    AuditModule,
    DatabaseModule,
    DocumentsModule,
  ],
  controllers: [
    CertificateStoreController,
    ES03Controller,
    S3000Controller,
    S1xxxController,
    S22xxController,
    SubmissionController,
  ],
  providers: [
    CertificateStoreService,
    ESocialEmitService,
    ESocialWorkerService,
    IcpSignerService,
    ES03Service,
    S1000Builder,
    S1005Builder,
    S1010Builder,
    S1020Builder,
    S1050Builder,
    S1070Builder,
    S1xxxDispatchService,
    S1xxxService,
    S2200Builder,
    S2205Builder,
    S2230Builder,
    S2299Builder,
    S3000Builder,
    S3000Service,
    S22xxDispatchService,
    S22xxService,
    BatchBuilderService,
    CircuitBreakerService,
    RetryStrategyService,
    SoapClientService,
    SubmissionService,
    XsdValidatorService,
  ],
  exports: [
    CertificateStoreService,
    ESocialEmitService,
    ESocialWorkerService,
    ES03Service,
    IcpSignerService,
    S1xxxService,
    S3000Service,
    S22xxService,
    SubmissionService,
    XsdValidatorService,
  ],
})
export class ESocialWorkerModule {}
