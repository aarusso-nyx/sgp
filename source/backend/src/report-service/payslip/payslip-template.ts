export interface PayslipLine {
  code: string;
  description: string;
  reference: string;
  earning: string;
  deduction: string;
}

export interface PayslipDocument {
  tenantName: string;
  legalReference: string;
  employee: {
    id: string;
    registration: string;
    name: string;
    cpf: string;
    employmentLink: string;
    bankAgency: string;
    bankAccount: string;
  };
  payrollRunId: string;
  competence: string;
  totals: {
    earnings: string;
    deductions: string;
    net: string;
    irrfBase: string;
    inssBase: string;
    fgtsDeposit: string;
  };
  lines: PayslipLine[];
}

export function buildPayslipFileName(document: PayslipDocument): string {
  const competence = document.competence.slice(0, 7);
  const registration = document.employee.registration.replace(
    /[^a-z0-9_-]/gi,
    '-',
  );
  return `contracheque-${registration}-${competence}.pdf`;
}

export function buildPayslipStorageKey(
  tenantId: string,
  document: PayslipDocument,
): string {
  const competence = document.competence.slice(0, 7).replace('-', '/');
  return `${tenantId}/outputs/payslip/${competence}/${document.employee.id}.pdf`;
}
