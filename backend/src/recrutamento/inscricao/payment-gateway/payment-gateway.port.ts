export interface PaymentChargeRequest {
  inscricaoId: string;
  amount: string;
  candidateCpf: string;
  candidateName: string;
}

export interface PaymentChargeResult {
  gateway: 'BOLETO' | 'PIX' | 'OTHER';
  amount: string;
  externalId: string;
  pixQrCode: string;
  boletoBarcode: string;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGatewayPort {
  createCharge(request: PaymentChargeRequest): Promise<PaymentChargeResult>;
}
