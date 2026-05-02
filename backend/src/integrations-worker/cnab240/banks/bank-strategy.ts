export interface BankSpecificFields {
  convenio: string;
  agencyAgreement: string;
  modality: string;
}

export interface BankStrategy {
  readonly bankCode: string;
  readonly bankName: string;
  readonly layoutVersion: string;
  readonly fields: BankSpecificFields;
}
