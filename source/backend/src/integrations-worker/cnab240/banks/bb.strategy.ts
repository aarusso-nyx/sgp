import type { BankStrategy } from './bank-strategy';

export const bbStrategy: BankStrategy = {
  bankCode: '001',
  bankName: 'BANCO DO BRASIL',
  layoutVersion: 'CNAB240-FEBRABAN-10.11-BB',
  fields: {
    convenio: 'SGPBBPAGAMENTO',
    agencyAgreement: '00001',
    modality: 'SALARIO',
  },
};
