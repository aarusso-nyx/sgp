import { UnprocessableEntityException } from '@nestjs/common';

import { ExemptionService } from './exemption.service';
import { InscricaoService } from './inscricao.service';
import { MockGatewayAdapter } from './payment-gateway/mock-gateway.adapter';

describe('InscricaoService validation', () => {
  const service = new InscricaoService(
    { configured: true } as never,
    new ExemptionService(),
    new MockGatewayAdapter(),
  );

  const candidate = {
    cpf: '52998224725',
    fullName: 'Maria Silva',
    birthDate: '1990-01-10',
    email: 'maria@example.test',
    phone: '11999999999',
    address: {
      street: 'Rua A',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01000-000',
    },
  };

  it('accepts age, education, and professional registry requirements', () => {
    expect(() =>
      service.validateRequirements(
        { minAge: 18, education: 'SUPERIOR', professionalRegistry: true },
        candidate,
        { education: 'SUPERIOR', professionalRegistry: 'CRM-1' },
      ),
    ).not.toThrow();
  });

  it('rejects invalid CPF with a normalized 422 error', () => {
    expect(() =>
      service.validateRequirements(
        {},
        { ...candidate, cpf: '11111111111' },
        {},
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejects candidates below the minimum age', () => {
    expect(() =>
      service.validateRequirements(
        { minAge: 30 },
        { ...candidate, birthDate: '2010-01-10' },
        {},
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('requires explicit quota self-declaration values', () => {
    expect(() => service.validateQuotaSelfDeclaration({ pcd: false })).toThrow(
      UnprocessableEntityException,
    );
  });
});
