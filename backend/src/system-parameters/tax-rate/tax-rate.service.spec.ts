/* eslint-disable */
import { BadRequestException } from '@nestjs/common';

import { TaxRateService } from './tax-rate.service';

describe('TaxRateService', () => {
  const service = new TaxRateService({ configured: false } as never);

  it('accepts continuous five-bracket IRRF tables', () => {
    expect(() =>
      service.validateContinuity([
        bracket('1', '0.00', '2259.20'),
        bracket('2', '2259.21', '2826.65'),
        bracket('3', '2826.66', '3751.05'),
        bracket('4', '3751.06', '4664.68'),
        bracket('5', '4664.69', null),
      ]),
    ).not.toThrow();
  });

  it('rejects gaps between IRRF brackets', () => {
    expect(() =>
      service.validateContinuity([
        bracket('1', '0.00', '2259.20'),
        bracket('2', '2259.22', '2826.65'),
        bracket('3', '2826.66', '3751.05'),
        bracket('4', '3751.06', '4664.68'),
        bracket('5', '4664.69', null),
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects wrong bracket shapes for IRRF and RPPS', () => {
    expect(() =>
      service.validateContinuity([bracket('1', '0.00', null)]),
    ).toThrow('IRRF table must contain exactly 5 brackets');
    expect(() => service.validateContinuity([], 'RPPS')).toThrow(
      'RPPS table must contain brackets',
    );
    expect(() =>
      service.validateContinuity([
        bracket('1', '1.00', '10.00'),
        bracket('2', '10.01', '20.00'),
        bracket('3', '20.01', '30.00'),
        bracket('4', '30.01', '40.00'),
        bracket('5', '40.01', null),
      ]),
    ).toThrow('First IRRF bracket must start at 0.00');
    expect(() =>
      service.validateContinuity([
        bracket('1', '0.00', '10.00'),
        bracket('2', '10.01', null),
        bracket('3', '20.01', '30.00'),
        bracket('4', '30.01', '40.00'),
        bracket('5', '40.01', null),
      ]),
    ).toThrow('Only the final IRRF bracket can be open-ended');
    expect(() =>
      service.validateContinuity([
        bracket('1', '0.00', '10.00'),
        bracket('2', '10.01', '20.00'),
        bracket('3', '20.01', '30.00'),
        bracket('4', '30.01', '40.00'),
        bracket('5', '40.01', '50.00'),
      ]),
    ).toThrow('Final IRRF bracket must be open-ended');
    expect(() =>
      service.validateContinuity([
        bracket('1', '0.00', '-1.00'),
        bracket('2', '0.00', '10.00'),
        bracket('3', '10.01', '20.00'),
        bracket('4', '20.01', '30.00'),
        bracket('5', '30.01', null),
      ]),
    ).toThrow('IRRF bracket max must be greater than min');
  });

  it('maps list results, RPPS ceiling, and date variants', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'rate-1',
          code: 'IRRF-1',
          name: 'IRRF faixa 1',
          competence_start: new Date('2026-01-01T00:00:00.000Z'),
          competence_end: '2026-12-31',
          reference_year: 2026,
          bracket_min: '0.00',
          bracket_max: '2259.20',
          rate: '0.000000',
          deduction_amount: '0.00',
          dependent_deduction: '189.59',
          updated_at: '2026-05-02T10:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ amount: '7500.00' }]);
    const configured = new TaxRateService({ configured: true, query } as never);

    await expect(
      configured.listIrrfTables('2026-05-01'),
    ).resolves.toMatchObject([
      {
        id: 'rate-1',
        competenceStart: '2026-01-01',
        competenceEnd: '2026-12-31',
        updatedAt: '2026-05-02T10:00:00.000Z',
      },
    ]);
    await expect(configured.listRppsTables()).resolves.toEqual({
      ceilingAmount: '7500.00',
      brackets: [],
    });
  });

  it('upserts IRRF and RPPS tables with audit and optional ceiling writes', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const db = {
      configured: true,
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((fn) => fn(client)),
    };
    const configured = new TaxRateService(db as never);

    await configured.upsertIrrfTable({
      referenceYear: '2026',
      competenceStart: '2026-01-01',
      brackets: [
        bracket('1', '0.00', '2259.20'),
        bracket('2', '2259.21', '2826.65'),
        bracket('3', '2826.66', '3751.05'),
        bracket('4', '3751.06', '4664.68'),
        bracket('5', '4664.69', null),
      ],
    });
    await configured.upsertRppsTable({
      referenceYear: '2026',
      competenceStart: '2026-01-01',
      ceilingAmount: '7500.00',
      brackets: [bracket('RPPS-1', '0.00', null)],
    });

    expect(db.transaction).toHaveBeenCalledTimes(2);
    expect(
      client.query.mock.calls.some((call) =>
        String(call[0]).includes('TETO_RPPS'),
      ),
    ).toBe(true);
  });
});

function bracket(code: string, min: string, max: string | null) {
  return {
    code,
    bracketMin: min,
    bracketMax: max,
    rate: '0.000000',
    deductionAmount: '0.00',
    dependentDeduction: '189.59',
  };
}
