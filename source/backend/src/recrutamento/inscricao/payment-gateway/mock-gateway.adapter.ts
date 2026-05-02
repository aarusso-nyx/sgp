import { Injectable } from '@nestjs/common';

import {
  PaymentChargeRequest,
  PaymentChargeResult,
  PaymentGatewayPort,
} from './payment-gateway.port';

@Injectable()
export class MockGatewayAdapter implements PaymentGatewayPort {
  async createCharge(
    request: PaymentChargeRequest,
  ): Promise<PaymentChargeResult> {
    await Promise.resolve();
    const suffix = request.inscricaoId.slice(0, 8);
    return {
      gateway: 'PIX',
      amount: request.amount,
      externalId: `mock-${suffix}`,
      pixQrCode: `PIX-MOCK-${request.candidateCpf}-${suffix}`,
      boletoBarcode: `23790.00000 00000.000000 00000.000000 0 ${suffix}`,
    };
  }
}
