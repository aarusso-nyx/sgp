import { BadRequestException } from '@nestjs/common';

import { LayoutFieldService } from './layout-field.service';

describe('LayoutFieldService', () => {
  const service = new LayoutFieldService({ configured: true } as never);

  it('requires precision and scale for DECIMAL fields', () => {
    expect(() =>
      service.validateDecimal({
        layoutVersionId: 'layout-1',
        fieldPath: 'folha.valor',
        dataType: 'DECIMAL',
        ordering: 1,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects precision and scale for non-DECIMAL fields', () => {
    expect(() =>
      service.validateDecimal({
        layoutVersionId: 'layout-1',
        fieldPath: 'folha.codigo',
        dataType: 'STRING',
        decimalPrecision: 14,
        decimalScale: 2,
        ordering: 1,
      }),
    ).toThrow(BadRequestException);
  });
});
