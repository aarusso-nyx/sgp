import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Decimal from 'decimal.js';

interface GoldenFixture {
  competence: {
    year: number;
    month: number;
  };
  rates: {
    inssLinearPercent: string;
    atsPercentPerYear: string;
    rppsCeiling: string;
    irrfDependentDeduction: string;
    irrf: IrrfBracket[];
    rpps: RppsBracket[];
  };
  vectors: GoldenVector[];
}

interface GoldenVector {
  id: string;
  registration: string;
  contractType: string;
  salary: string;
  serviceYears: number;
  dependents: number;
  abonoPermanencia: boolean;
}

interface IrrfBracket {
  min: string;
  max: string | null;
  rate: string;
  deduction: string;
}

interface RppsBracket {
  min: string;
  max: string | null;
  rate: string;
}

interface GoldenPayrollItem {
  vectorId: string;
  employeeRegistration: string;
  code: string;
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
  'payroll-mensal-v01',
);

describe('folha mensal golden monetary fixture', () => {
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
    const salary = new Decimal(vector.salary);
    const rpps = computeRpps(salary, input.rates.rppsCeiling, input.rates.rpps);
    const inss = money(
      salary.times(input.rates.inssLinearPercent).div(100),
    ).toFixed(2);
    const ats = money(
      salary
        .times(vector.serviceYears)
        .times(input.rates.atsPercentPerYear)
        .div(100),
    ).toFixed(2);
    const abono =
      vector.abonoPermanencia && vector.contractType === 'statutory'
        ? rpps
        : new Decimal(0);

    rows.push(
      row(input, vector, 'MONTHLY_BASE_SALARY', 'EARNING', salary.toFixed(2), {
        quantity: `${daysInMonth(input.competence.year, input.competence.month)}.0000`,
      }),
    );

    if (vector.contractType !== 'statutory') {
      rows.push(row(input, vector, 'INSS', 'DEDUCTION', inss));
    }

    if (!new Decimal(ats).isZero()) {
      rows.push(row(input, vector, 'ATS', 'EARNING', ats));
    }

    if (!abono.isZero()) {
      rows.push(
        row(input, vector, 'ABONO_PERMANENCIA', 'EARNING', abono.toFixed(2)),
      );
    }

    if (vector.contractType === 'statutory' && !rpps.isZero()) {
      rows.push(row(input, vector, 'RPPS', 'DEDUCTION', rpps.toFixed(2)));
    }

    const taxableEarnings = salary.plus(
      vector.contractType === 'statutory' ? ats : 0,
    );
    const socialSecurity =
      vector.contractType === 'statutory' ? rpps : new Decimal(inss);
    const irrfBase = taxableEarnings.minus(socialSecurity);
    const irrf = computeIrrf(
      irrfBase,
      vector.dependents,
      input.rates.irrfDependentDeduction,
      input.rates.irrf,
    );
    if (!irrf.isZero()) {
      rows.push(row(input, vector, 'IRRF', 'DEDUCTION', irrf.toFixed(2)));
    }

    return rows;
  });
}

function row(
  input: GoldenFixture,
  vector: GoldenVector,
  code: string,
  kind: 'EARNING' | 'DEDUCTION',
  amount: string,
  options: { quantity?: string } = {},
): GoldenPayrollItem {
  return {
    vectorId: vector.id,
    employeeRegistration: vector.registration,
    code,
    kind,
    source: 'CALCULATED',
    competenceYear: input.competence.year,
    competenceMonth: input.competence.month,
    quantity: options.quantity ?? '1.0000',
    referenceValue: new Decimal(vector.salary).toFixed(2),
    amount,
    notes: `Monthly ${code} calculation`,
  };
}

function computeRpps(
  base: Decimal,
  ceiling: string,
  brackets: RppsBracket[],
): Decimal {
  const effectiveBase = Decimal.min(base, new Decimal(ceiling));
  const total = brackets.reduce((sum, bracket) => {
    const min = new Decimal(bracket.min);
    if (min.greaterThan(effectiveBase)) return sum;
    const upper = bracket.max
      ? Decimal.min(effectiveBase, new Decimal(bracket.max))
      : effectiveBase;
    const slice = min.isZero()
      ? upper
      : Decimal.max(upper.minus(min).plus('0.01'), 0);
    return sum.plus(slice.times(bracket.rate).div(100));
  }, new Decimal(0));
  return money(total);
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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as T;
}
