import { UnprocessableEntityException } from '@nestjs/common';

import { ExemptionService } from './exemption.service';

describe('ExemptionService', () => {
  const service = new ExemptionService();

  it('accepts CadUnico exemption with valid NIS evidence', () => {
    expect(service.decide({ kind: 'CADUNICO', nis: '12345678901' })).toEqual({
      kind: 'CADUNICO',
      exempt: true,
      evidenceRef: 'cadunico:12345678901',
    });
  });

  it('accepts bone marrow donor exemption with registry evidence', () => {
    expect(
      service.decide({
        kind: 'BONE_MARROW_DONOR',
        donorRegistry: 'REDOME-123',
      }),
    ).toEqual({
      kind: 'BONE_MARROW_DONOR',
      exempt: true,
      evidenceRef: 'bone-marrow:REDOME-123',
    });
  });

  it('rejects CadUnico exemption without normalized NIS', () => {
    expect(() => service.decide({ kind: 'CADUNICO', nis: '123' })).toThrow(
      UnprocessableEntityException,
    );
  });
});
