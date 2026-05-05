import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { IcpSignerService } from './signature/icp-signer.service';
import { PadesAdapter } from './signature/pades.adapter';
import { TenantFiscalCertificateService } from './signature/tenant-fiscal-certificate.service';
import { ExternalController } from './external.controller';
import { ExternalService } from './external.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ExternalController],
  providers: [
    ExternalService,
    IcpSignerService,
    PadesAdapter,
    TenantFiscalCertificateService,
  ],
  exports: [IcpSignerService, PadesAdapter, TenantFiscalCertificateService],
})
export class ExternalModule {}
