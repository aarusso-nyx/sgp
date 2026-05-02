import type { BankStrategy } from './bank-strategy';

export const itauStrategy: BankStrategy = {
  bankCode: '341',
  bankName: 'ITAU',
  layoutVersion: 'CNAB240-FEBRABAN-10.11-ITAU',
  fields: {
    convenio: 'SGPITAUPAGFOR',
    agencyAgreement: '00001',
    modality: 'PAGFOR',
  },
};
