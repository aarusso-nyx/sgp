import Decimal from 'decimal.js';

export interface YearlyIncomeAggregate {
  tenantId: string;
  tenantName: string;
  tenantDocument: string;
  employeeId: string;
  registration: string;
  employeeName: string;
  cpf: string;
  employmentLink: string;
  yearBase: number;
  taxableTotal: string;
  thirteenthSalary: string;
  vacationTotal: string;
  severanceTotal: string;
  exemptTotal: string;
  inssRppsTotal: string;
  irrfTotal: string;
  dependentsCount: number;
  s1210Total: string;
  s1210IrrfTotal: string;
  recomputedAt: string;
}

export interface YearlyIncomeDocument {
  payer: {
    name: string;
    document: string;
  };
  employee: {
    id: string;
    registration: string;
    name: string;
    cpf: string;
    employmentLink: string;
  };
  yearBase: number;
  totals: {
    taxableTotal: string;
    thirteenthSalary: string;
    vacationTotal: string;
    severanceTotal: string;
    exemptTotal: string;
    inssRppsTotal: string;
    irrfTotal: string;
    dependentsCount: number;
  };
  esocialTotal: string;
  esocialIrrfTotal: string;
  legalReference: string;
  recomputedAt: string;
}

export function toYearlyIncomeDocument(
  aggregate: YearlyIncomeAggregate,
): YearlyIncomeDocument {
  const taxablePlusExempt = money(aggregate.taxableTotal).plus(
    money(aggregate.exemptTotal),
  );
  const s1210Total = money(aggregate.s1210Total);
  if (!taxablePlusExempt.equals(s1210Total)) {
    throw new Error(
      `S-1210 coherence failed for ${aggregate.employeeId}/${aggregate.yearBase}: ${taxablePlusExempt.toFixed(2)} != ${s1210Total.toFixed(2)}`,
    );
  }
  const irrfTotal = money(aggregate.irrfTotal);
  const s1210IrrfTotal = money(aggregate.s1210IrrfTotal);
  if (!irrfTotal.equals(s1210IrrfTotal)) {
    throw new Error(
      `S-1210 IRRF coherence failed for ${aggregate.employeeId}/${aggregate.yearBase}: ${irrfTotal.toFixed(2)} != ${s1210IrrfTotal.toFixed(2)}`,
    );
  }

  return {
    payer: {
      name: aggregate.tenantName || 'Ente publico',
      document: aggregate.tenantDocument || '',
    },
    employee: {
      id: aggregate.employeeId,
      registration: aggregate.registration,
      name: aggregate.employeeName,
      cpf: aggregate.cpf,
      employmentLink: aggregate.employmentLink,
    },
    yearBase: aggregate.yearBase,
    totals: {
      taxableTotal: fixed(aggregate.taxableTotal),
      thirteenthSalary: fixed(aggregate.thirteenthSalary),
      vacationTotal: fixed(aggregate.vacationTotal),
      severanceTotal: fixed(aggregate.severanceTotal),
      exemptTotal: fixed(aggregate.exemptTotal),
      inssRppsTotal: fixed(aggregate.inssRppsTotal),
      irrfTotal: fixed(aggregate.irrfTotal),
      dependentsCount: aggregate.dependentsCount,
    },
    esocialTotal: fixed(aggregate.s1210Total),
    esocialIrrfTotal: fixed(aggregate.s1210IrrfTotal),
    legalReference:
      'IN RFB 2.060/2021, art. 16 e Anexo I - Comprovante de Rendimentos Pagos e de IRRF.',
    recomputedAt: aggregate.recomputedAt,
  };
}

export function buildYearlyIncomeFileName(
  document: YearlyIncomeDocument,
): string {
  const registration = document.employee.registration.replace(
    /[^a-z0-9_-]/gi,
    '-',
  );
  return `comprovante-rendimentos-${registration}-${document.yearBase}.pdf`;
}

export function buildYearlyIncomeStorageKey(
  tenantId: string,
  document: YearlyIncomeDocument,
): string {
  return `${tenantId}/outputs/yearly-income/${document.yearBase}/${document.employee.id}.pdf`;
}

function fixed(value: string): string {
  return money(value).toFixed(2);
}

function money(value: string): Decimal {
  return new Decimal(value || '0').toDecimalPlaces(2);
}
