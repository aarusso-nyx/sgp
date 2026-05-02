import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ExemptionService } from './exemption.service';
import { InscricaoController } from './inscricao.controller';
import { InscricaoService } from './inscricao.service';
import { MockGatewayAdapter } from './payment-gateway/mock-gateway.adapter';
import { PAYMENT_GATEWAY } from './payment-gateway/payment-gateway.port';

@Module({
  imports: [DatabaseModule],
  controllers: [InscricaoController],
  providers: [
    ExemptionService,
    InscricaoService,
    { provide: PAYMENT_GATEWAY, useClass: MockGatewayAdapter },
  ],
  exports: [InscricaoService, ExemptionService],
})
export class InscricaoModule {}
