export const ALIMONY_PURPOSE_CODE = 'ALIM';

export interface AlimonyRemittanceOrder {
  alimonyId: string;
  employeeId: string;
  beneficiaryName: string;
  beneficiaryCpf: string;
  beneficiaryBankCode: string;
  beneficiaryBranch: string;
  beneficiaryAccount: string;
  amount: string;
}

export function toAlimonyPaymentInput(order: AlimonyRemittanceOrder) {
  const [account = '', accountDigit = '0'] =
    order.beneficiaryAccount.split('-');
  return {
    employeeId: order.employeeId,
    employeeName: order.beneficiaryName,
    employeeDocument: order.beneficiaryCpf,
    bankCode: order.beneficiaryBankCode,
    branch: order.beneficiaryBranch,
    branchDigit: null,
    account,
    accountDigit,
    amount: order.amount,
    purposeCode: ALIMONY_PURPOSE_CODE,
    alimonyId: order.alimonyId,
  };
}
