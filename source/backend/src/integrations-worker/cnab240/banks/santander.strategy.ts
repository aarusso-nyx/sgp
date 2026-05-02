import type { BankStrategy } from './bank-strategy';

export const santanderStrategy: BankStrategy = {
  bankCode: '033',
  bankName: 'SANTANDER',
  layoutVersion: 'CNAB240-FEBRABAN-10.11-SANTANDER',
  fields: {
    convenio: 'SGPSANTANDER',
    agencyAgreement: '00001',
    modality: 'FORNECEDOR',
  },
};
