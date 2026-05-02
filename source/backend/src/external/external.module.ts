import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { IcpSignerService } from './signature/icp-signer.service';
import { PadesAdapter } from './signature/pades.adapter';
import { ExternalController } from './external.controller';
import { ExternalService } from './external.service';

@Module({
  imports: [AuthModule],
  controllers: [ExternalController],
  providers: [ExternalService, IcpSignerService, PadesAdapter],
  exports: [IcpSignerService, PadesAdapter],
})
export class ExternalModule {}
