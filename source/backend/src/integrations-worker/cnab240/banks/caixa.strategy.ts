import type { BankStrategy } from './bank-strategy';

export const caixaStrategy: BankStrategy = {
  bankCode: '104',
  bankName: 'CAIXA',
  layoutVersion: 'CNAB240-FEBRABAN-10.11-CAIXA',
  fields: {
    convenio: 'SGPCAIXAFOLHA',
    agencyAgreement: '00001',
    modality: 'CREDITO',
  },
};
