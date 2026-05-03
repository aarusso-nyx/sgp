import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Decimal from 'decimal.js';

interface GoldenFixture {
  referenceYear: number;
  rates: {
    irrfDependentDeduction: string;
    irrf: IrrfBracket[];
  };
  vectors: GoldenVector[];
}

interface GoldenVector {
  id: string;
  registration: string;
  avos: number;
  firstSalary: string;
  closingSalary: string;
  dependents: number;
}

interface IrrfBracket {
  min: string;
  max: string | null;
  rate: string;
  deduction: string;
}

interface GoldenPayrollItem {
  vectorId: string;
  employeeRegistration: string;
  code:
    | 'DECIMO_TERCEIRO_ADIANTAMENTO'
    | 'DECIMO_TERCEIRO_FECHAMENTO'
    | 'IRRF_13';
  kind: 'EARNING' | 'DEDUCTION';
  source: 'CALCULATED';
  competenceYear: number;
  competenceMonth: number;
  quantity: string;
  referenceValue: string;
  amount: string;
  notes: string;
}

const fixtureDir = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'tests',
  'backend',
  'golden',
  'decimo-terceiro-v01',
);

describe('decimo terceiro golden monetary fixture', () => {
  it('keeps the v01 employee_payroll_item rows byte-stable', () => {
    const input = readFixture<GoldenFixture>('input.json');
    const actualRows = buildExpectedRows(input);
    const actualBytes = `${JSON.stringify(actualRows, null, 2)}\n`;
    const expectedBytes = readFileSync(
      join(fixtureDir, 'expected-employee-payroll-items.json'),
      'utf8',
    );

    expect(actualBytes).toBe(expectedBytes);
  });
});

function buildExpectedRows(input: GoldenFixture): GoldenPayrollItem[] {
  return input.vectors.flatMap((vector) => {
    const rows: GoldenPayrollItem[] = [];
    const firstBase = new Decimal(vector.firstSalary);
    const closingBase = new Decimal(vector.closingSalary);
    const firstTotal = thirteenthTotal(firstBase, vector.avos);
    const closingTotal = thirteenthTotal(closingBase, vector.avos);
    const firstInstallment = money(firstTotal.div(2));
    const closingInstallment = Decimal.max(
      money(closingTotal.minus(firstInstallment)),
      0,
    );

    rows.push(
      row(input, vector, {
        code: 'DECIMO_TERCEIRO_ADIANTAMENTO',
        month: 11,
        referenceValue: firstBase.toFixed(2),
        amount: firstInstallment.toFixed(2),
        firstDiscount: '0.00',
      }),
      row(input, vector, {
        code: 'DECIMO_TERCEIRO_FECHAMENTO',
        month: 12,
        referenceValue: closingBase.toFixed(2),
        amount: closingInstallment.toFixed(2),
        firstDiscount: firstInstallment.toFixed(2),
      }),
    );

    const irrf = computeIrrf(
      closingTotal,
      vector.dependents,
      input.rates.irrfDependentDeduction,
      input.rates.irrf,
    );
    if (!irrf.isZero()) {
      rows.push({
        vectorId: vector.id,
        employeeRegistration: vector.registration,
        code: 'IRRF_13',
        kind: 'DEDUCTION',
        source: 'CALCULATED',
        competenceYear: input.referenceYear,
        competenceMonth: 12,
        quantity: '1.0000',
        referenceValue: closingInstallment.toFixed(2),
        amount: irrf.toFixed(2),
        notes: `IRRF exclusivo 13 salario base=${closingBase.toFixed(2)}`,
      });
    }

    return rows;
  });
}

function row(
  input: GoldenFixture,
  vector: GoldenVector,
  options: {
    code: 'DECIMO_TERCEIRO_ADIANTAMENTO' | 'DECIMO_TERCEIRO_FECHAMENTO';
    month: 11 | 12;
    referenceValue: string;
    amount: string;
    firstDiscount: string;
  },
): GoldenPayrollItem {
  return {
    vectorId: vector.id,
    employeeRegistration: vector.registration,
    code: options.code,
    kind: 'EARNING',
    source: 'CALCULATED',
    competenceYear: input.referenceYear,
    competenceMonth: options.month,
    quantity: new Decimal(vector.avos).toFixed(4),
    referenceValue: options.referenceValue,
    amount: options.amount,
    notes: `${options.code} avos=${vector.avos} first_discount=${options.firstDiscount}`,
  };
}

function thirteenthTotal(base: Decimal, avos: number): Decimal {
  return money(base.times(Math.min(Math.max(avos, 0), 12)).div(12));
}

function computeIrrf(
  base: Decimal,
  dependents: number,
  dependentDeduction: string,
  brackets: IrrfBracket[],
): Decimal {
  const taxableBase = Decimal.max(
    base.minus(new Decimal(dependentDeduction).times(dependents)),
    0,
  );
  const bracket = brackets.find((candidate) => {
    const min = new Decimal(candidate.min);
    const max = candidate.max ? new Decimal(candidate.max) : null;
    return (
      min.lessThanOrEqualTo(taxableBase) &&
      (!max || max.greaterThanOrEqualTo(taxableBase))
    );
  });
  if (!bracket) return new Decimal(0);
  return Decimal.max(
    money(taxableBase.times(bracket.rate).div(100).minus(bracket.deduction)),
    0,
  );
}

function money(value: Decimal.Value): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as T;
}
