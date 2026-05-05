export interface ResolvedCompanyBankAccount {
  id: string;
  tenantId: string;
  bankId: string;
  bankCode: string;
  branch: string;
  branchDv: string | null;
  account: string;
  accountDv: string;
  convenio: string;
  agencyAgreement: string;
  modality: string;
  serviceFormCode: string;
  purposeCodeDefault: string | null;
  layoutVersion: string;
  relayEndpointUrl: string | null;
  relayCredentialSecretRef: string | null;
  relayMode: 'mock' | 'http' | 'sftp';
  active: boolean;
}

export interface CompanyBankAccountLookup {
  bankCode: string;
  serviceFormCode: string;
}
