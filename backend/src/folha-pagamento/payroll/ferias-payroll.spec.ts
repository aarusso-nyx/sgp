import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Decimal from 'decimal.js';

interface GoldenFixture {
  competence: {
    year: number;
    month: number;
  };
  rates: {
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
  vacationDays: number;
  pecuniaryBonusDays: number;
  dependents: number;
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
  'ferias-folha-v01',
);

describe('ferias folha golden monetary fixture', () => {
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
    const salary = new Decimal(vector.salary);
    const dailyAmount = salary.div(30);
    const vacationSalary = money(dailyAmount.times(vector.vacationDays));
    const oneThird = money(vacationSalary.div(3));
    const pecuniaryBonus = money(dailyAmount.times(vector.pecuniaryBonusDays));
    const rppsBase = money(vacationSalary.plus(pecuniaryBonus));
    const rpps =
      vector.contractType === 'statutory'
        ? computeRpps(rppsBase, input.rates.rppsCeiling, input.rates.rpps)
        : new Decimal(0);
    const irrfBase = money(
      vacationSalary.plus(oneThird).plus(pecuniaryBonus).minus(rpps),
    );
    const irrf = computeIrrf(
      irrfBase,
      vector.dependents,
      input.rates.irrfDependentDeduction,
      input.rates.irrf,
    );
    const rows: GoldenPayrollItem[] = [
      row(input, vector, 'VACATION_SALARY', 'EARNING', vacationSalary, {
        quantity: decimalQuantity(vector.vacationDays),
        referenceValue: salary,
      }),
      row(input, vector, 'VACATION_ONE_THIRD', 'EARNING', oneThird, {
        referenceValue: vacationSalary,
      }),
    ];

    if (pecuniaryBonus.greaterThan(0)) {
      rows.push(
        row(
          input,
          vector,
          'VACATION_PECUNIARY_BONUS',
          'EARNING',
          pecuniaryBonus,
          {
            quantity: decimalQuantity(vector.pecuniaryBonusDays),
            referenceValue: salary,
          },
        ),
      );
    }

    if (rpps.greaterThan(0)) {
      rows.push(
        row(input, vector, 'RPPS', 'DEDUCTION', rpps, {
          referenceValue: rppsBase,
        }),
      );
    }

    if (irrf.greaterThan(0)) {
      rows.push(
        row(input, vector, 'IRRF_VACATION', 'DEDUCTION', irrf, {
          referenceValue: irrfBase,
        }),
      );
    }

    return rows;
  });
}

function row(
  input: GoldenFixture,
  vector: GoldenVector,
  code: string,
  kind: 'EARNING' | 'DEDUCTION',
  amount: Decimal,
  options: { quantity?: string; referenceValue: Decimal } = {
    referenceValue: new Decimal(vector.salary),
  },
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
    referenceValue: options.referenceValue.toFixed(2),
    amount: amount.toFixed(2),
    notes: `vacation_record_id=<fixture>; amount=${amount.toFixed(2)}`,
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
      ? Decimal.max(upper, 0)
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

function decimalQuantity(value: number): string {
  return new Decimal(value).toFixed(4);
}

function money(value: Decimal.Value): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as T;
}
