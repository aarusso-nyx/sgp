import type { BankStrategy } from './bank-strategy';

export const bradescoStrategy: BankStrategy = {
  bankCode: '237',
  bankName: 'BRADESCO',
  layoutVersion: 'CNAB240-FEBRABAN-10.11-BRADESCO',
  fields: {
    convenio: 'SGPBRADESCO',
    agencyAgreement: '00001',
    modality: 'PAGFOR',
  },
};
