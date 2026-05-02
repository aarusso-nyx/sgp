import {
  toYearlyIncomeDocument,
  YearlyIncomeAggregate,
} from './yearly-income-template';

const base: YearlyIncomeAggregate = {
  tenantId: '00000000-0000-4000-8000-000000000100',
  tenantName: 'Municipio de Teste',
  tenantDocument: '12345678000199',
  employeeId: '00000000-0000-4000-8000-000000000001',
  registration: 'MAT-001',
  employeeName: 'Servidor Teste',
  cpf: '00011122233',
  employmentLink: 'Efetivo',
  yearBase: 2025,
  taxableTotal: '60000.00',
  thirteenthSalary: '0.00',
  vacationTotal: '0.00',
  severanceTotal: '0.00',
  exemptTotal: '0.00',
  inssRppsTotal: '6600.00',
  irrfTotal: '4200.00',
  dependentsCount: 1,
  s1210Total: '60000.00',
  recomputedAt: '2026-02-28T00:00:00.000Z',
};

describe('yearly income golden scenarios', () => {
  it('maps an active employee with monthly payroll only', () => {
    const document = toYearlyIncomeDocument(base);

    expect(document.totals).toMatchObject({
      taxableTotal: '60000.00',
      thirteenthSalary: '0.00',
      vacationTotal: '0.00',
      severanceTotal: '0.00',
      irrfTotal: '4200.00',
    });
  });

  it('maps 13th salary and vacation totals with Decimal exactness', () => {
    const document = toYearlyIncomeDocument({
      ...base,
      taxableTotal: '74500.25',
      thirteenthSalary: '5000.25',
      vacationTotal: '9500.00',
      exemptTotal: '1200.00',
      s1210Total: '75700.25',
    });

    expect(document.totals.thirteenthSalary).toBe('5000.25');
    expect(document.totals.vacationTotal).toBe('9500.00');
    expect(document.esocialTotal).toBe('75700.25');
  });

  it('maps severance totals for a termination in the year-base', () => {
    const document = toYearlyIncomeDocument({
      ...base,
      taxableTotal: '70000.00',
      severanceTotal: '10000.00',
      exemptTotal: '2500.00',
      s1210Total: '72500.00',
    });

    expect(document.totals.severanceTotal).toBe('10000.00');
    expect(document.totals.exemptTotal).toBe('2500.00');
  });

  it('rejects totals that diverge from the S-1210 annual totalizer', () => {
    expect(() =>
      toYearlyIncomeDocument({
        ...base,
        exemptTotal: '1.00',
        s1210Total: '60000.00',
      }),
    ).toThrow('S-1210 coherence failed');
  });
});
